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

  async selectStagesAndProvideVariables(fullCatalog: Catalog, options: {ci?: boolean, clusterType?: string}, input?: InputModel): Promise<{ stages: { [name: string]: Stage }, variables: TerraformVariable[] }> {
    const selectedModules: SingleModuleVersion[] = await this.selectModules(fullCatalog, options, input);

    const {stages, baseVariables} = await this.buildStages(selectedModules, options, input);

    console.log('Stages', {stages, baseVariables});

    const variables: TerraformVariable[] = await this.provideValuesForVariables(baseVariables);

    return {stages, variables};
  }

  async selectModules(fullCatalog: Catalog, options: {ci?: boolean, clusterType?: string}, input?: InputModel): Promise<SingleModuleVersion[]> {

    const catalog: Catalog = await this.filterCatalogByClusterType(fullCatalog, options, input);

    const modules: Module[] = await this.makeModuleSelections(catalog, options, input);

    return new SelectedModules(catalog).resolveModules(modules);
  }

  async filterCatalogByClusterType(catalog: Catalog, options: {ci?: boolean, clusterType?: string}, input: Partial<InputModel> = {}): Promise<Catalog> {
    const builder: QuestionBuilder<{clusterType: string}> = await Container.get(QuestionBuilder)
      .question({
        name: 'clusterType',
        type: 'list',
        message: 'What is the target platform?',
        choices: [
          {value: 'ocp4', name: 'OpenShift 4.X'},
          {value: 'ocp3', name: 'OpenShift 3.11'},
          {value: 'kubernetes', name: 'Kubernetes'},
        ]
      }, options.clusterType || input.platform);

    if (options.ci && builder.hasQuestions()) {
      throw new Error('Missing clusterType value');
    }

    const {clusterType} = await builder.prompt();

    return catalog.filter({platform: clusterType});
  }

  async makeModuleSelections(catalog: Catalog, options: {ci?: boolean}, input?: InputModel): Promise<Module[]> {
    type QuestionResult = {[category: string]: Module | Module[]};
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
          });
        } else if (category.selection === 'single') {
          const choices = category.modules.map(m => ({name: `${m.name}: ${m.description} `, value: m}));
          choices.push({name: 'None', value: null});

          questionBuilder.question({
            name: category.category,
            type: 'list',
            message: `Which ${category.category} module should be used?`,
            choices,
          });
        } else if (category.selection === 'multiple') {
          const choices = category.modules.map(m => ({name: `${m.name}: ${m.description} `, value: m}));

          questionBuilder.question({
            name: category.category,
            type: 'checkbox-plus',
            message: `Which ${category.category} module(s) should be used?`,
            choices,
            source: async (answers: QuestionResult, input: any): Promise<any[]> => choices,
          });
        }

        return questionBuilder;
      }, new QuestionBuilderImpl<QuestionResult>());

    return Object.values(await questionBuilder.prompt())
      .map((value: Module | Module[]) => isModuleArray(value) ? value : [value])
      .reduce((result: Module[], current: Module[]) => {
        if (current) {
          result.push(...(current as Module[]));
        }

        return result;
      }, [])
  }

  async buildStages(selectedModules: SingleModuleVersion[], options: {ci?: boolean}, input?: InputModel): Promise<{stages: {[source: string]: Stage}, baseVariables: IBaseVariable[]}> {
    const stages: {[source: string]: Stage} = selectedModules.reduce((stages: {[source: string]: Stage}, module: SingleModuleVersion) => {
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

  async provideValuesForVariables(baseVariables: IBaseVariable[]): Promise<TerraformVariable[]> {
    const questions: Question[] = baseVariables.map(v => ({
      type: 'input',
      name: v.name,
      message: () => v.description ? `'${v.name}' (${v.description})` : `'${v.name}'`
    }));

    if (questions.length > 0) {
      console.log('Provide the default values (if any) for the global variables:');
    }

    const result = await prompt(questions);

    return baseVariables
      .map(v => Object.assign(v, {value: result[v.name]}))
      .map(v => new TerraformVariableImpl(v));
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
        type: v.type,
        variable: v,
      });

      return placeholderVariable;
    }
  });

  return stageVariables;
}

function moduleToStage(stages: {[source: string]: Stage}, modules: SingleModuleVersion[], selectedModule: SingleModuleVersion): Stage {
  const stage: Stage = new StageImpl({
    name: selectedModule.name,
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

  const questions: Question[] = openVariables.reduce((results: Question[], variable: PlaceholderVariable) => {
    const moduleVariable: ModuleVariable = variable.variable;
    const moduleVariableType = moduleVariable.type ? moduleVariable.type : 'string';
    const inputQuestion: Question & {suggestions: string[]} = {
      type: 'suggest',
      name: variable.name,
      message: `'${variable.variable.name}':`,
      default: variable.name,
      when: (answers) => {
        return !answers[variable.name] || answers[variable.name].name === '[new]';
      },
      validate: (input) => {
        if (globalVariables.some((v => v.name === input))) {
          return 'A variable with that name already exists';
        }

        return true;
      },
      filter: (input: string) => {
        const formattedInput: string = input.replace(' ', '_');
        return {
          name: formattedInput,
          description: moduleVariable.description,
          type: moduleVariableType,
          toString: () => formattedInput,
        };
      },
      suggestions: [variable.name].concat(globalVariables.map(v => v.name)),
    };

    return results.concat([inputQuestion]);
  }, []);

  if (questions.length === 0) {
    return stage;
  }

  const questionBuilder: QuestionBuilder<{[name: string]: IBaseVariable}> = new QuestionBuilderImpl()
    .questions(questions);

  if (questionBuilder.hasQuestions()) {
    console.log(`Provide the global variable name for each variable of the ${chalk.yellow(stage.name)} module:`);
  }

  const answers: {[name: string]: IBaseVariable} = await questionBuilder.prompt();

  globalVariables.push(...Object.keys(answers).map(name => answers[name]));

  const variables: GlobalRefVariable[] = Object.keys(answers).map(name => new GlobalRefVariable({name, variableName: answers[name].name}));

  return Object.assign({}, stage, {variables: stage.variables.filter(v => !isPlaceholderVariable(v)).concat(variables)});
}
