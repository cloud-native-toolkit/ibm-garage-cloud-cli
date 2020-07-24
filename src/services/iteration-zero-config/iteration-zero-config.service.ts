import {Inject} from 'typescript-ioc';
import {promises as fs, existsSync} from 'fs';
import {join} from 'path';
import {safeLoad} from 'js-yaml';

import {IterationZeroConfigApi} from './iteration-zero-config.api';
import {InputModel, IterationZeroConfigModel} from './iteration-zero-config.model';
import {CatalogLoader, Catalog} from './catalog-loader';
import {ModuleSelector, Stage, TerraformVariable} from './module-selector';
import {LoggerApi} from '../../logger';
import {StageImpl} from './module-selector/module-selector.impl';

export class IterationZeroConfigService implements IterationZeroConfigApi {
  @Inject
  _logger: LoggerApi;
  @Inject
  catalogLoader: CatalogLoader;
  @Inject
  moduleSelector: ModuleSelector;

  get logger(): LoggerApi {
    return this._logger.child('IterationZeroConfigService');
  }

  async buildConfig(options: IterationZeroConfigModel): Promise<any> {
    const catalog: Catalog = await this.catalogLoader.loadCatalog(options.catalogUrl);

    const input: InputModel | undefined = await this.loadInput(options.input);

    const {stages, variables} = await this.moduleSelector.selectStagesAndProvideVariables(catalog, options, input);

    await this.outputTerraform(stages, variables);
  }

  async loadInput(inputFileName: string): Promise<InputModel | undefined> {
    if (!inputFileName) {
      return;
    }

    const buffer: Buffer = await fs.readFile(inputFileName);

    return safeLoad(buffer.toString()) as InputModel;
  }

  async outputTerraform(stages: { [p: string]: Stage }, variables: TerraformVariable[], outputDir = join(process.cwd(), 'output')) {
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir);
    }

    const variableString: string = variables.map(v => v.asString()).join('\n');
    await fs.writeFile(join(outputDir, 'variables.tf'), variableString);

    const stageBuffer: Buffer = Object.keys(stages)
      .map(key => stages[key])
      .reduce((buffer: Buffer, stage: Stage) => {
        if (!stage.asString) {
           stage = new StageImpl(stage);
        }
        return Buffer.concat([
          buffer,
          Buffer.from(stage.asString(stages))
        ]);
      }, Buffer.from(''));
    await fs.writeFile(join(outputDir, 'stages.tf'), stageBuffer);
  }
}

