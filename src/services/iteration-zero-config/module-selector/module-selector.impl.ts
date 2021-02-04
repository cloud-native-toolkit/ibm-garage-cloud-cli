import {Container, Inject} from 'typescript-ioc';
import {prompt, Question} from 'inquirer';
import * as chalk from 'chalk';

import {ModuleSelector, TerraformVariable} from './module-selector.api';
import {
  IStage,
  Module,
  ModuleDependency,
  ModuleOutputRef,
  ModuleVariable,
  ModuleVersion,
  SingleModuleVersion,
  Stage,
} from './module-selector.model';
import {Catalog, CatalogCategoryModel} from '../catalog-loader';
import {
  fromBaseVariable,
  GlobalRefVariable,
  isPlaceholderVariable,
  ModuleRefVariable,
  PlaceholderVariable,
  TerraformVariableImpl
} from './module-selector.variables';
import {SelectedModules} from './selected-modules.model';
import {ModuleNotFound} from '../iteration-zero-config.api';
import {BaseVariable, IBaseVariable,} from '../variables.model';
import {QuestionBuilder} from '../../../util/question-builder';
import {LoggerApi} from '../../../logger';
import {of as arrayOf} from '../../../util/array-util';
import {QuestionBuilderImpl} from '../../../util/question-builder/question-builder.impl';
import {InputModel} from '../iteration-zero-config.model';
import first from '../../../util/first';
import {Optional} from '../../../util/optional';

export class StageImpl implements Stage {
  name: string;
  source: string;
  module: SingleModuleVersion;
  variables: Array<BaseVariable>;

  constructor(values: IStage) {
    Object.assign(this, values);
  }

  asString(stages: {[name: string]: {name: string}}): string {
    return `module "${this.name}" {
  source = "${this.module.id}?ref=${this.module.version.version}"
  
${this.variablesAsString(stages)}
}
`;
  }

  private variablesAsString(stages: {[name: string]: {name: string}}, indent = '  '): string {
    const variableBuffer: Buffer = this.variables
      .filter(v => !!v)
      .reduce((buffer: Buffer, variable: BaseVariable) => {
        if (!variable.asString) {
          variable = fromBaseVariable(variable);
        }

        return Buffer.concat([
          buffer,
          Buffer.from(indent + variable.asString(stages))
        ]);
      }, Buffer.from(''));

    return variableBuffer.toString();
  }
}

export class ModuleSelectorImpl implements ModuleSelector {
  @Inject
  _logger: LoggerApi;

  get logger(): LoggerApi {
    return this._logger.child('ModuleSelectorImpl');
  }

  async selectStagesAndProvideVariables(fullCatalog: Catalog, filter: { provider: string, platform: string }, input?: InputModel): Promise<{ stages: { [name: string]: Stage }, variables: TerraformVariable[] }> {
    const selectedModules: SingleModuleVersion[] = await this.selectModules(fullCatalog, filter, input);

    const {stages, baseVariables} = await this.buildStages(selectedModules, input);

    const variables: TerraformVariable[] = await this.baseVariableToTerraformVariable(baseVariables);

    return {stages, variables};
  }

  async selectModules(fullCatalog: Catalog, filter: { provider: string, platform: string }, input?: InputModel): Promise<SingleModuleVersion[]> {

    const catalog: Catalog = await this.filterCatalogByClusterType(fullCatalog, filter);

    const modules: Module[] = await this.makeModuleSelections(catalog, input);

    return new SelectedModules(catalog).resolveModules(modules);
  }

  async filterCatalogByClusterType(catalog: Catalog, filter: { provider: string, platform: string }): Promise<Catalog> {
    return catalog.filter(filter);
  }

  async makeModuleSelections(catalog: Catalog, input?: InputModel): Promise<Module[]> {
    type QuestionResult = { [category: string]: Module | Module[] };

    function isModuleArray(value: Module | Module[]): value is Module[] {
      return !!value && Array.isArray(value as any);
    }

    const questionBuilder: QuestionBuilder<QuestionResult> = catalog.categories
      .reduce((questionBuilder: QuestionBuilder<QuestionResult>, category: CatalogCategoryModel) => {
        if (category.modules.length === 0) {
          return questionBuilder;
        }

        if (category.selection === 'required') {
          const choices = category.modules.map(m => ({name: `${m.name}: ${m.description} `, value: m}));

          questionBuilder.question({
            name: category.category,
            type: 'list',
            message: `Which ${category.category} module should be used?`,
            choices,
          }, '', true);
        } else if (category.selection === 'single') {
          const choices = category.modules.map(m => ({name: `${m.name}: ${m.description} `, value: m}));
          choices.push({name: 'None', value: null});

          questionBuilder.question({
            name: category.category,
            type: 'list',
            message: `Which ${category.category} module should be used?`,
            choices,
          }, '', true);
        } else if (category.selection === 'multiple') {
          const choices = category.modules.map(m => ({name: `${m.name}: ${m.description} `, value: m}));

          questionBuilder.question({
            name: category.category,
            type: 'checkbox-plus',
            message: `Which ${category.category} module(s) should be used?`,
            choices,
            source: async (answers: QuestionResult, input: any): Promise<any[]> => choices,
          }, '', true);
        }

        return questionBuilder;
      }, new QuestionBuilderImpl<QuestionResult>());

    return Object.values(await questionBuilder.prompt())
      .map((value: Module | Module[]) => isModuleArray(value) ? value : [value])
      .reduce((result: Module[], current: Module[]) => {
        if (current) {
          result.push(...(current as Module[]).filter(m => !!m));
        }

        return result;
      }, [])
  }

  async buildStages(selectedModules: SingleModuleVersion[], input?: InputModel): Promise<{ stages: { [source: string]: Stage }, baseVariables: IBaseVariable[] }> {
    const stages: { [source: string]: Stage } = selectedModules.reduce((stages: { [source: string]: Stage }, module: SingleModuleVersion) => {
      moduleToStage(stages, selectedModules, module);
      return stages;
    }, {});

    const baseVariables: IBaseVariable[] = [];

    const stageSources: string[] = Object.keys(stages);
    for (let i = 0; i < stageSources.length; i++) {
      stages[stageSources[i]] = await processStageVariables(stages[stageSources[i]], baseVariables);
    }

    return {stages, baseVariables};
  }

  async baseVariableToTerraformVariable(baseVariables: IBaseVariable[]): Promise<TerraformVariable[]> {
    return baseVariables.map(v => new TerraformVariableImpl({
      name: v.name,
      description: v.description,
      value: v.defaultValue
    }))
  }
}

function getStageFromModuleRef(moduleSource: string, stages: { [p: string]: Stage }, modules: SingleModuleVersion[]): Stage {
  if (stages[moduleSource]) {
    return stages[moduleSource];
  }

  const filteredModules: SingleModuleVersion[] = modules.filter(m => m.id === moduleSource);
  if (filteredModules.length === 0) {
    throw new ModuleNotFound(moduleSource);
  }

  return moduleToStage(stages, modules, filteredModules[0]);
}

function getSourceForModuleRef(moduleRef: ModuleOutputRef, moduleVersion: ModuleVersion, stages: { [p: string]: Stage }, modules: SingleModuleVersion[]): string {
  const moduleDeps: ModuleDependency = arrayOf(moduleVersion.dependencies)
    .filter(d => d.id === moduleRef.id)
    .first()
    .orElseThrow(new ModuleNotFound(moduleRef.id));

  if (moduleDeps.refs.length === 1) {
    return moduleDeps.refs[0].source;
  }

  return arrayOf(moduleDeps.refs)
    .map((r => stages[r.source]))
    .filter((s: Stage) => !!s)
    .map(s => s.source)
    .first()
    .orElseThrow(new ModuleNotFound(moduleDeps.id));
}

function defaultValue(variable: ModuleVariable) {
  if (variable.default !== null && variable.default !== undefined) {
    return variable.default;
  }

  return variable.defaultValue;
}

function moduleVariablesToStageVariables(module: SingleModuleVersion, stages: {[source: string]: Stage}, modules: SingleModuleVersion[]): Array<BaseVariable> {
  const moduleVersion: ModuleVersion = module.version;
  const variables: ModuleVariable[] = moduleVersion.variables;

  const stageVariables: BaseVariable[] = variables.map(v => {
    if (v.moduleRef) {
      const moduleRef: ModuleOutputRef = v.moduleRef;

      const moduleRefSource: string = getSourceForModuleRef(moduleRef, moduleVersion, stages, modules);
      const refStage: Stage = getStageFromModuleRef(moduleRefSource, stages, modules);

      const moduleRefVariable: ModuleRefVariable = new ModuleRefVariable({
        name: v.name,
        moduleRef: refStage,
        moduleOutputName: moduleRef.output
      });

      return moduleRefVariable;
    } else {
      const placeholderVariable: PlaceholderVariable = new PlaceholderVariable({
        name: v.name,
        description: v.description,
        type: v.type || 'string',
        scope: v.scope || 'module',
        defaultValue: defaultValue(v),
        alias: v.alias,
        variable: v,
      });

      return placeholderVariable;
    }
  });

  return stageVariables;
}

function moduleToStage(stages: {[source: string]: Stage}, modules: SingleModuleVersion[], selectedModule: SingleModuleVersion): Stage {
  const stage: Stage = new StageImpl({
    name: selectedModule.alias || selectedModule.name,
    source: selectedModule.id,
    module: selectedModule,
    variables: [],
  });

  stages[stage.source] = stage;

  stage.variables = moduleVariablesToStageVariables(selectedModule, stages, modules);

  return stage;
}

async function processStageVariables(stage: Stage, globalVariables: IBaseVariable[]): Promise<Stage> {
  const openVariables: BaseVariable[] = stage.variables.filter(v => isPlaceholderVariable(v));

  if (openVariables.length === 0) {
    return stage;
  }

  const stageVariables: IBaseVariable[] = stage.variables.map((variable: BaseVariable) => {
    if (!isPlaceholderVariable(variable)) {
      return variable;
    }

    if (variable.scope === 'ignore' && variable.defaultValue) {
      // nothing to do since the variable should be ignored and a default value has been provided
    } else {
      const name = variable.scope === 'global'
        ? buildGlobalVariableName(variable)
        : buildModuleVariableName(variable, stage.name);

      const globalVariable: IBaseVariable = first(globalVariables.filter(v => v.name === name))
        .orElseGet(() => {
          const newVariable: IBaseVariable = Object.assign({type: 'string'}, variable, {name});

          globalVariables.push(newVariable);

          return newVariable;
        });

      return new GlobalRefVariable({
        name: variable.name,
        type: variable.type,
        variableName: globalVariable.name,
        description: variable.description
      });
    }
  });

  return Object.assign({}, stage, {variables: stageVariables});
}

function buildGlobalVariableName(variable: IBaseVariable) {
  return variable.alias || variable.name;
}

function buildModuleVariableName(variable: IBaseVariable, stageName: string) {
  return stageName + '_' + buildGlobalVariableName(variable);
}
