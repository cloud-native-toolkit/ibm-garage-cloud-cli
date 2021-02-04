import {Container, Inject} from 'typescript-ioc';
import {promises as fs, existsSync} from 'fs';
import {join} from 'path';
import {safeLoad} from 'js-yaml';

import {IterationZeroConfigApi} from './iteration-zero-config.api';
import {InputModel, IterationZeroConfigModel} from './iteration-zero-config.model';
import {CatalogLoader, Catalog} from './catalog-loader';
import {ModuleSelector, Stage, TerraformVariable} from './module-selector';
import {LoggerApi} from '../../logger';
import {StageImpl} from './module-selector/module-selector.impl';
import {QuestionBuilder} from '../../util/question-builder';

interface TileVariable {
  key: string,
  type: 'string';
  default_value: string;
  description: string;
  required: boolean;
  hidden: boolean;
  options?: Array<{label: string, value: string}>;
}

function isUndefinedOrNull(value: any): boolean {
  return value === undefined || value === null;
}

function isDefinedAndNotNull(value: any): boolean {
  return value !== undefined && value !== null;
}

function tileMetadata(variables: TerraformVariable[], label: string, name: string, shortDescription?: string): any {
  const short_description = shortDescription || 'Installs a common set of DevOps tools used by developers into a cluster';

  const configuration: TileVariable[] = variables.map(v => ({
    key: v.name,
    type: 'string',
    default_value: v.defaultValue,
    description: v.description,
    options: v.options,
    required: isUndefinedOrNull(v.defaultValue),
    hidden: false,
  }));

  const metadata = {
    label,
    name,
    offering_icon_url: "https://globalcatalog.cloud.ibm.com/api/v1/1082e7d2-5e2f-0a11-a3bc-f88a8e1931fc/artifacts/terraform.svg",
    tags: [
      "terraform",
      "dev_ops"
    ],
    rating: {},
    short_description,
    kinds: [
      {
        format_kind: "terraform",
        install_kind: "terraform",
        target_kind: "terraform",
        versions: [
          {
            "version": "#VERSION",
            "catalog_id": "#CATALOG_ID",
            "repo_url": "https://github.com/#REPO_URL/",
            "tgz_url": `https://github.com/#REPO_URL/releases/download/#VERSION/${name}.tar.gz`,
            configuration,
            entitlement: {
              provider_name: "free",
              provider_id: "free"
            },
            install: {
              instructions: "N/A"
            },
            licenses: [
              {
                name: "LICENSE",
                url: "https://www.apache.org/licenses/LICENSE-2.0.txt"
              }
            ],
            deprecated: false,
            long_description: "#LONG_DESCRIPTION"
          }
        ]
      }
    ],
    catalog_id: "#CATALOG_ID",
    hidden: false,
    provider: "IBM",
    repo_info: {
      type: "public_git"
    }
  };

  return metadata;
}

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

    const filter: {provider: string, platform: string} = await this.getModuleFilters(options, input);

    const {stages, variables} = await this.moduleSelector.selectStagesAndProvideVariables(catalog, filter, input);

    // await this.outputModuleSelections(filter, stages, variables);

    await this.outputTerraform(stages, variables);

    if (filter.provider) {
      await this.outputTileMetadata(variables);
    }
  }

  async loadInput(inputFileName: string): Promise<InputModel | undefined> {
    if (!inputFileName) {
      return;
    }

    const buffer: Buffer = await fs.readFile(inputFileName);

    return safeLoad(buffer.toString()) as InputModel;
  }

  async getModuleFilters(options: {ci?: boolean, clusterType?: string, provider?: string}, input: {platform?: string, provider?: string} = {}): Promise<{platform: string, provider: string}> {
    const providerBuilder: QuestionBuilder<{provider: string}> = await Container.get(QuestionBuilder)
      .question({
        name: 'provider',
        type: 'list',
        message: 'What is the target infrastructure provider?',
        choices: [
          {value: 'ibm', name: 'IBM Cloud'},
          {value: 'k8s', name: 'Other'},
        ]
      }, options.provider || input.provider);

    if (options.ci && providerBuilder.hasQuestions()) {
      throw new Error('Missing provider value');
    }

    const {provider} = await providerBuilder.prompt();

    const choices = provider === 'k8s'
      ? [{value: 'ocp4', name: 'OpenShift 4.X'}]
      : [{value: 'ocp4', name: 'OpenShift 4.X'}, {value: 'kubernetes', name: 'Kubernetes'}];

    const platformBuilder: QuestionBuilder<{platform: string}> = await Container.get(QuestionBuilder)
      .question({
        name: 'platform',
        type: 'list',
        message: 'What is the target platform?',
        choices: choices
      }, options.clusterType || input.platform);

    if (options.ci && platformBuilder.hasQuestions()) {
      throw new Error('Missing clusterType value');
    }

    const {platform} = await platformBuilder.prompt();

    return {provider, platform};
  }

  async outputTerraform(stages: { [p: string]: Stage }, variables: TerraformVariable[], outputDir = join(process.cwd(), 'output', 'terraform')) {
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
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

  private async outputTileMetadata(variables: TerraformVariable[], outputDir = join(process.cwd(), 'output', 'tile')) {
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    const name = 'custom-tile';
    const tile = tileMetadata(variables, 'Custom tile', name);

    await fs.writeFile(join(outputDir, `${name}.json`), JSON.stringify(tile, null, 2));
  }

  private async outputModuleSelections(filter: { provider: string; platform: string }, stages: { [p: string]: Stage }, variables: TerraformVariable[]) {
    const selections = Object.assign(
      {},
      filter,
      {

      },
    );
  }
}

