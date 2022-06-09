import {Container, Inject} from 'typescript-ioc';
import {ChoiceOptions} from 'inquirer';
import * as chalk from 'chalk';
import {get} from 'superagent';
import * as _ from 'lodash';
import {Subject} from 'rxjs';
import {searchAndRemove} from '../../util/searchandremove';
import {
  NamespaceMissingError,
  PipelineNamespaceNotProvided,
  RegisterPipeline,
  RegisterPipelineOptions
} from './register-pipeline.api';
import {Namespace as NamespaceService} from '../namespace';
import {CreateGitSecret, GitParams} from '../git-secret';
import {
  isTriggerBinding_v0_6, isTriggerTemplate_v1_14,
  KubeMetadata,
  KubeNamespace,
  KubeResource,
  KubeSecret,
  KubeTektonPipeline,
  KubeTektonPipelineResource,
  KubeTektonPipelineRun,
  KubeTektonTask,
  KubeTektonTriggerBinding,
  KubeTektonTriggerEventListener,
  KubeTektonTriggerTemplate,
  OcpRoute,
  RoleRule,
  Route,
  TektonPipeline,
  TektonPipelineParam,
  TektonPipelineRun,
  TemplateKubeMetadata,
  TriggerBinding,
  TriggerBindings,
  TriggerBindingsArrays,
  TriggerDefinition,
  TriggerDefinitionVersion,
  TriggerEventListener,
  TriggerTemplate
} from '../../api/kubectl';
import {CreateServiceAccount} from '../create-service-account';
import {QuestionBuilder} from '../../util/question-builder';
import {ClusterType} from '../../util/cluster-type';
import {KubeDeployment} from '../../api/kubectl/deployment';
import {CreateWebhook} from '../create-webhook';
import {
  apiFromUrl,
  CreateWebhookErrorTypes,
  GitApi,
  GitEvent,
  isCreateWebhookError,
  LocalGitApi,
  WebhookParams,
  LocalGitRepo,
} from '@cloudnativetoolkit/git-client'
import {GetConsoleUrlApi} from '../console';
import {Logger} from '../../util/logger';
import progressBar from '../../util/progress-bar';

const noopNotifyStatus = (test: string) => undefined;

export interface TektonPipelineOptions {
  pipelineNamespace: string;
  templateNamespace: string;
}

export interface IBMCloudConfig {
  CLUSTER_TYPE: string;
  APIURL: string;
  SERVER_URL: string;
  RESOURCE_GROUP: string;
  REGISTRY_URL: string;
  REGISTRY_NAMESPACE: string;
  REGION: string;
  CLUSTER_NAME: string;
  INGRESS_SUBDOMAIN: string;
  TLS_SECRET_NAME: string;
}

export interface RegistryAccess {
  REGISTRY_NAMESPACE?: string;
  REGISTRY_URL: string;
}

interface PipelineArgs {
  pipelineName?: string;
  params?: Array<{name: string, value: string}>;
}

function isPipelineArgs(value: PipelineArgs | {}): value is PipelineArgs {
  return !!value && !!(value as PipelineArgs).pipelineName;
}

type PipelineRunBuilder = <M>(params: {gitUrl: string, gitRevision: string, template: boolean}) => TektonPipelineRun<M>;

interface SemVer {
  major: number;
  minor: number
  patch: number;
}

interface TriggerConfig {
  name: string;
  triggerBinding: string;
  triggerTemplate: string;
  filter: string;
  serviceAccount: string;
}

const progressSubject = <T = any>(logger: Logger) => {
  const subject: Subject<T> = new Subject();

  subject.subscribe({
    next: () => logger.logn('.'),
    complete: () => logger.log('')
  })

  return subject;
}

export class RegisterTektonPipeline implements RegisterPipeline {
  @Inject
  createGitSecret: CreateGitSecret;
  @Inject
  kubeNamespace: KubeNamespace;
  @Inject
  kubeDeployment: KubeDeployment;
  @Inject
  pipelineResource: KubeTektonPipelineResource;
  @Inject
  pipelineRun: KubeTektonPipelineRun;
  @Inject
  triggerTemplate: KubeTektonTriggerTemplate;
  @Inject
  triggerBinding: KubeTektonTriggerBinding;
  @Inject
  triggerEventListener: KubeTektonTriggerEventListener;
  @Inject
  triggerRoute: OcpRoute;
  @Inject
  pipeline: KubeTektonPipeline;
  @Inject
  tektonTask: KubeTektonTask;
  @Inject
  secret: KubeSecret;
  @Inject
  serviceAccount: CreateServiceAccount;
  @Inject
  clusterType: ClusterType;
  @Inject
  namespace: NamespaceService;
  @Inject
  createWebhook: CreateWebhook;
  @Inject
  consoleUrl: GetConsoleUrlApi;
  @Inject
  logger: Logger;

  async registerPipeline(cliOptions: Partial<RegisterPipelineOptions>, notifyStatus: (text: string) => void = noopNotifyStatus) {

    const options: RegisterPipelineOptions = await this.setupDefaultOptions(cliOptions);

    const { clusterType } = await this.clusterType.getClusterType(options.pipelineNamespace);

    notifyStatus(`Creating pipeline on ${chalk.yellow(clusterType)} cluster in ${chalk.yellow(options.pipelineNamespace)} namespace`);

    if (!options.pipelineNamespace) {
      throw new PipelineNamespaceNotProvided('A pipeline namespace must be provided', clusterType);
    }

    if (!(await this.kubeNamespace.exists(options.pipelineNamespace))) {
      throw new NamespaceMissingError('The pipeline namespace does not exist: ' + options.pipelineNamespace, clusterType);
    }

    notifyStatus('Retrieving git parameters');
    const { gitParams, secretName } = await this.createGitSecret.getParametersAndCreateSecret(
      Object.assign(
        {},
        options,
        {
          namespaces: [options.pipelineNamespace],
          replace: options.replaceGitSecret,
        }
      ),
      notifyStatus,
    );

    const serviceAccount = 'pipeline';

    const pipelineArgs: PipelineArgs | {} = await this.getPipelineArgs(options.templateNamespace, options, gitParams);

    if (isPipelineArgs(pipelineArgs)) {
      const templatePipelineName = pipelineArgs.pipelineName;
      const params = pipelineArgs.params;

      await progressBar(this.logger)(
        this.tektonTask.copyAll({ namespace: options.templateNamespace }, options.pipelineNamespace),
        `Copying tasks from ${chalk.yellow(options.templateNamespace)}`
      );

      const pipelineName: string = await this.pipeline.copy( 
        templatePipelineName,
        options.templateNamespace,
        options.pipelineNamespace,
        this.generatePipelineName(gitParams),
        (val: TektonPipeline): TektonPipeline => {
          //console.log("Pipeline params",val.metadata);
          val.metadata= searchAndRemove(val.metadata)
          //console.log("--------------AFTER------------",val.metadata);
          params.forEach(p => {
            val.spec.params
              .filter(param => param.name === p.name)
              .forEach(param => param.default = p.value);
          });

          return val;
        }
      ).then(pipelineValue => pipelineValue.metadata.name);
      notifyStatus(`Copied Pipeline from ${options.templateNamespace}/${templatePipelineName} to ${options.pipelineNamespace}/${pipelineName}`);

      const pipelineRunBuilder = this.buildPipelineRunBuilder({
        pipelineName,
      });

      notifyStatus(`Creating TriggerTemplate for pipeline: ${pipelineName}`);
      const triggerTemplateValue: TriggerTemplate = await this.createTriggerTemplate({
        name: pipelineName,
        pipelineNamespace: options.pipelineNamespace,
        pipelineRunBuilder,
      });

      const gitApi: GitApi = await apiFromUrl(gitParams.url, gitParams, gitParams.branch);

      const bindingName = 'trigger-binding';

      notifyStatus(`Creating TriggerBinding for pipeline: ${pipelineName}`);
      const triggerBindingValue: TriggerBinding = await this.createTriggerBinding({
        name: bindingName,
        pipelineNamespace: options.pipelineNamespace,
        gitApi,
      });

      const eventListenerName = 'tekton';

      notifyStatus(`Creating/updating TriggerEventListener for pipeline: ${eventListenerName}`);
      await this.createUpdateTriggerEventListener({
        name: eventListenerName,
        pipelineNamespace: options.pipelineNamespace,
        serviceAccount,
        triggerTemplate: triggerTemplateValue.metadata.name,
        triggerBinding: triggerBindingValue.metadata.name,
        gitApi,
      });

      notifyStatus(`Creating/updating Route for pipeline: ${eventListenerName}`);
      const triggerRouteValue: Route = await this.createTriggerRoute({
        name: `el-${eventListenerName}`,
        pipelineNamespace: options.pipelineNamespace,
      });

      notifyStatus(`Creating PipelineRun for pipeline: ${pipelineName}`);
      const pipelineRun = await this.createPipelineRun(
        options.pipelineNamespace,
        pipelineRunBuilder({gitUrl: gitParams.url, gitRevision: gitParams.branch, template: false})
      );

      const webhookUrl = await this.getWebhookUrl(triggerRouteValue.spec.host);
      notifyStatus(`Creating ${gitApi.getType()} webhook for repo: ${gitParams.url}`);
      try {
        await this.createWebhook.createWebhook({
          gitUrl: gitParams.url,
          gitToken: gitParams.password,
          gitUsername: gitParams.username,
          webhookUrl,
        })
      } catch (err) {
        let errorMessage: string;
        if (isCreateWebhookError(err) && err.errorType === CreateWebhookErrorTypes.alreadyExists) {
          errorMessage = 'Webhook already exists for this trigger in this repository.';
        }  else {
          errorMessage = `Error creating webhook.
  Check your access token is correct and that it has permission to create webhooks.
  The webhook can be manually created by sending push events to ${chalk.yellow(webhookUrl)}}`
        }

        notifyStatus(`${chalk.yellow('Warning:')} ${errorMessage}`)
      }

      notifyStatus('');
      notifyStatus(`Pipeline run started: ${chalk.whiteBright(pipelineRun.metadata.name)}`);
      notifyStatus('');
      notifyStatus(`Next steps:`);
      notifyStatus(`  Tekton cli:`);
      notifyStatus(`    View PipelineRun info - ${chalk.whiteBright(`tkn pr describe ${pipelineRun.metadata.name}`)}`);
      notifyStatus(`    View PipelineRun logs - ${chalk.whiteBright(`tkn pr logs -f ${pipelineRun.metadata.name}`)}`);

      const pipelineRunUrl: string = await this.buildPipelineRunUrl(pipelineRun.metadata.name, pipelineRun.metadata.namespace).catch(err => '');
      if (pipelineRunUrl) {
        notifyStatus(`  OpenShift console:`);
        notifyStatus(`    View PipelineRun - ${chalk.whiteBright(pipelineRunUrl)}`);
      }
    }
  }

  async buildPipelineRunUrl(pipelineRunName: string, namespace: string): Promise<string> {
    const consoleUrl: string = await this.consoleUrl.getConsoleUrl();

    return `${consoleUrl}/k8s/ns/${namespace}/tekton.dev~v1beta1~PipelineRun/${pipelineRunName}`;
  }

  async getWebhookUrl(webhookHost: string): Promise<string> {
    const url = `https://${webhookHost}`;
    try {
      await get(url);

      return url;
    } catch (err) {
      return `http://${webhookHost}`;
    }
  }

  generatePipelineName(gitParams: GitParams): string {
    let formattedName = (gitParams.repo)
      .toLowerCase()
      .replace(/[.]/g, '-')
      .replace(/--+/g, '-');

    if (formattedName.length <= 56) {
      return formattedName;
    }

    const nameSegments = formattedName.split('-');
    for (let i = 0; i < nameSegments.length && nameSegments.join('-').length > 56; i++) {
      nameSegments[i] = nameSegments[i][0];
    }

    return nameSegments.join('-');
  }

  async createServiceAccount(namespace: string, clusterType: string, secrets: string[] = [], notifyStatus: (text: string) => void): Promise<string> {

    const name = 'pipeline';
    notifyStatus(`Creating service account: ${name}`);
    if (clusterType !== 'openshift') {
      const rules: RoleRule[] = [{
        apiGroups: [''],
        resources: [
          'services',
          'pods',
          'pods/exec',
          'pods/log',
          'secrets',
          'configmaps',
        ],
        verbs: ['*']
      }, {
        apiGroups: ['apps'],
        resources: ['deployments'],
        verbs: ['*'],
      }, {
        apiGroups: ['extensions'],
        resources: ['ingresses'],
        verbs: ['*'],
      }];

      await this.serviceAccount.createKubernetes(namespace, name, rules);
    } else {
      await this.serviceAccount.createOpenShift(namespace, name, ['privileged'], ['edit'], secrets);
    }

    return name;
  }

  async buildImageUrl(options: TektonPipelineOptions, params: { repo: string }): Promise<string> {

    const registryConfig: RegistryAccess = await this.secret.getData<RegistryAccess>('registry-access', options.pipelineNamespace);
    if (!registryConfig) {
      throw new Error('Unable to retrieve Image Registry secret (registry-access) in namespace: ' + options.pipelineNamespace);
    }

    const registryUrl = registryConfig.REGISTRY_URL || 'image-registry.openshift-image-registry.svc:5000';
    const registryNamespace = registryConfig.REGISTRY_NAMESPACE || options.pipelineNamespace;

    return `${registryUrl}/${registryNamespace}/${params.repo}:latest`;
  }

  async getPipelineArgs(namespace: string, {pipeline, pipelineParams = {}, gitUrl}: RegisterPipelineOptions, gitParams: GitParams): Promise<PipelineArgs> {

    const pipelineName: string = await this.getPipelineName(namespace, gitParams, gitUrl, pipeline);
    if (!pipelineName) {
      return {};
    }

    const questionBuilder: QuestionBuilder = Container.get(QuestionBuilder);

    const templateParams: TektonPipelineParam[] = await this.getPipelineParams(namespace, pipelineName);
    templateParams.forEach((param: TektonPipelineParam) => {
      questionBuilder.question({
        type: param.default === 'true' || param.default === 'false' ? 'confirm' : 'input',
        name: param.name,
        message: `${chalk.yellowBright(param.name)}: ${param.description}?`,
        default: param.default,
      }, pipelineParams[param.name])
    });

    const paramsObj = await questionBuilder.prompt();
    const params: Array<{name: string, value: string}> = Object.keys(paramsObj)
      .reduce((result: Array<{name: string, value: string}>, name: string) => {
        const param = {name, value: '' + paramsObj[name]};

        result.push(param);

        return result;
      }, []);

    return {pipelineName, params};
  }

  private async getPipelineName(namespace: string, gitParams: GitParams, gitUrl?: string, pipeline?: string): Promise<string> {
    this.logger.log(`Retrieving available template pipelines from ${chalk.yellow(namespace)}`);

    const filteredPipelines: TektonPipeline[] = this.filterPipelines(
      await this.pipeline.list({namespace}),
      await this.getProjectType(gitParams, gitUrl),
      pipeline
    );

    const pipelineChoices: Array<ChoiceOptions> = filteredPipelines
      .map(p => p.metadata.name)
      .map(name => ({ name, value: name }));

    if (pipelineChoices.length === 0) {
      this.logger.log(`No Pipelines found in ${namespace} namespace. Skipping PipelineRun creation`);
      this.logger.log('Install Tekton tasks and pipelines into your namespace by following these instructions: ' + chalk.yellow('https://github.com/IBM/ibm-garage-tekton-tasks'));
      return '';
    }

    if (pipelineChoices.length === 1 && !pipeline) {
      pipeline = pipelineChoices[0].value;
    }

    const questionBuilder: QuestionBuilder<{pipelineName: string}> = Container.get(QuestionBuilder)
      .question({
        type: 'list',
        choices: pipelineChoices.concat({ name: 'Skip PipelineRun creation', value: 'none' }),
        name: 'pipelineName',
        message: 'Select the Pipeline to use in the PipelineRun:',
      }, pipeline);

    const {pipelineName} = await questionBuilder.prompt();

    return pipelineName === 'none' ? '' : pipelineName;
  }

  async getPipelineParams(namespace: string, name: string): Promise<TektonPipelineParam[]> {
    const pipeline = await this.pipeline.get(name, namespace);

    const params = pipeline.spec.params || [];

    return params.filter(param => param.name !== 'git-url' && param.name !== 'git-revision');
  }

  async getProjectType(gitParams: GitParams, gitUrl?: string): Promise<{runtime?: string, builder?: string}> {

    try {
      const gitApi: LocalGitApi = gitUrl
        ? await apiFromUrl(gitUrl, {username: gitParams.username, password: gitParams.password}, gitParams.branch)
        : new LocalGitRepo();

      const files: { path: string, url?: string, contents?: string | Promise<string | Buffer> }[] = await gitApi.listFiles();

      const filenames = files.map(file => file.path);

      if (filenames.includes('pom.xml')) {
        return {runtime: 'openjdk', builder: 'maven'};
      } else if (filenames.includes('build.gradle')) {
        return {runtime: 'openjdk', builder: 'gradle'};
      } else if (filenames.includes('package.json')) {
        return {runtime: 'nodejs'};
      } else if (filenames.includes('Makefile')) {
        const file: { path: string, url?: string } = files.filter(file => file.path === 'Makefile')[0];

        const contents = await gitApi.getFileContents(file);

        if (contents.includes('operator-sdk')) {
          return {runtime: 'operator'};
        } else if (filenames.includes('go.mod')) {
          return {runtime: 'golang'};
        }
      }
    } catch (error) {
      // ignore error
    }

    return {};
  }

  filterPipelines(pipelines: TektonPipeline[], {runtime, builder}: {runtime?: string, builder?: string}, pipelineName?: string): TektonPipeline[] {

    if (pipelineName) {
      return pipelines;
    }

    if (!runtime) {
      return pipelines;
    }

    const matchRuntime = (pipeline: TektonPipeline) => {
      if (!runtime) {
        return true;
      }

      const pipelineRuntime = _.get(pipeline, ['metadata', 'annotations', 'app.openshift.io/runtime']);

      return !pipelineRuntime || pipelineRuntime === runtime;
    }

    const matchBuilder = (pipeline: TektonPipeline) => {
      if (!builder) {
        return true;
      }

      const pipelineBuilder = _.get(pipeline, ['metadata', 'annotations', 'app.openshift.io/builder']);

      return !pipelineBuilder || pipelineBuilder === builder;
    }

    const filteredPipelines: TektonPipeline[] = pipelines
      .filter(matchRuntime)
      .filter(matchBuilder);

    if (filteredPipelines.length === 0) {
      return pipelines;
    }

    const runtimeString = [runtime, builder].filter(v => !!v).join('/');

    this.logger.log(`Pipeline templates filtered based on detected runtime: ${chalk.whiteBright(runtimeString)}`);

    if (filteredPipelines.length === 1) {
      this.logger.log(`Selected pipeline: ${chalk.whiteBright(filteredPipelines.map(p => p.metadata.name).join(', '))}`)
    }

    return filteredPipelines;
  }

  buildPipelineRunBuilder(
    {
      pipelineName,
    }: {
      pipelineName: string,
    }
  ): PipelineRunBuilder {

    return ({gitUrl, gitRevision, template}: {gitUrl: string, gitRevision: string, template: boolean}) => {
      const metadata = template ? {generateName: `${pipelineName}-`} : {name: `${pipelineName}-${Date.now().toString(16)}`}

      const params = [
        {
          name: 'git-url',
          value: gitUrl
        },
        {
          name: 'git-revision',
          value: gitRevision
        },
      ];

      const result: TektonPipelineRun<KubeMetadata | TemplateKubeMetadata> = Object.assign(
        {
          metadata,
          spec: {
            pipelineRef: {
              name: pipelineName
            },
            params: params,
          },
        },
        template
          ? {apiVersion: 'tekton.dev/v1beta1', kind: 'PipelineRun',}
          : {}
      )

      return result as any;
    };
  }

  async createPipelineRun(pipelineNamespace: string, body: TektonPipelineRun<KubeMetadata>): Promise<TektonPipelineRun> {
    const pipelineRunName = body.metadata.name;

    return this.pipelineRun.create(
      pipelineRunName,
      {
        body
      },
      pipelineNamespace,
    );
  }

  async createTriggerTemplate<T extends KubeResource<TemplateKubeMetadata>>(
    {
      pipelineNamespace,
      name,
      pipelineRunBuilder,
    }: {
      pipelineNamespace: string,
      name: string,
      pipelineRunBuilder: (params: {gitRevision: string, gitUrl: string, template: boolean}) => TektonPipelineRun<TemplateKubeMetadata>
    }
  ) {

    return this.triggerTemplate.createOrUpdate(
      name,
      {
        body: {
          metadata: {
            name: name,
            labels: {
              app: name,
            },
          },
          spec: {
            params: [
              {
                name: 'gitrevision',
                description: 'The git revision'
              },
              {
                name: 'gitrepositoryurl',
                description: 'The git repository url'
              }
            ],
            resourcetemplates: [
              pipelineRunBuilder({
                gitRevision: '$(tt.params.gitrevision)',
                gitUrl: '$(tt.params.gitrepositoryurl)',
                template: true
              })
            ]
          },
        }
      },
      pipelineNamespace,
    );
  }

  async createTriggerBinding(
    {
      pipelineNamespace,
      name,
      gitApi,
    }: {
      pipelineNamespace: string,
      name: string,
      gitApi: GitApi
    }) {

    const webhookParams: WebhookParams = gitApi.buildWebhookParams(GitEvent.PUSH);

    return this.triggerBinding.createOrUpdate(
      name,
      {
        body: {
          metadata: {
            name: name,
            labels: {
              app: name,
            },
          },
          spec: {
            params: [
              {
                name: 'gitrevision',
                value: `$(${webhookParams.revisionPath})`
              },
              {
                name: 'gitrepositoryurl',
                value: `$(${webhookParams.repositoryUrlPath})`
              }
            ],
          },
        }
      },
      pipelineNamespace,
    );
  }

  async createUpdateTriggerEventListener(
    {
      pipelineNamespace,
      name,
      serviceAccount,
      triggerTemplate,
      triggerBinding,
      gitApi
    }: {
      pipelineNamespace: string,
      name: string,
      serviceAccount: string,
      triggerTemplate: string,
      triggerBinding: string,
      gitApi: GitApi
    }) {

    const webhookParams: WebhookParams = gitApi.buildWebhookParams(GitEvent.PUSH);

    const filter = `header.match('${webhookParams.headerName}', '${webhookParams.eventName}') && ${webhookParams.refPath} == '${webhookParams.ref}' && ${webhookParams.repositoryNamePath} == '${webhookParams.repositoryName}'`

    const eventListener: TriggerEventListener<TriggerDefinition> = await this.triggerEventListener.get(name, pipelineNamespace).catch(err => undefined);

    const bindingName: string = this.buildTriggerBindingName(webhookParams.repositoryName, webhookParams.branchName);

    const handlers: EventListenerHandler[] = [
      new EventListenerHandlerV1_14(),
      new EventListenerHandlerV0_6(),
      new EventListenerHandlerV0_4(),
    ];

    const result = await handlers
      .reduce(async (p: Promise<TriggerEventListener<TriggerDefinition>>, current: EventListenerHandler): Promise<TriggerEventListener<TriggerDefinition>> => {
          try {
          const val: TriggerEventListener<TriggerDefinition> = await p;
          if (val) {
            return val;
          }
        } catch (error) { }

        return current.createEventListener(name, {name: bindingName, triggerBinding, triggerTemplate, filter, serviceAccount}, eventListener, pipelineNamespace);
      }, Promise.resolve(undefined))

    const deploymentName = `el-${name}`;
    await progressBar(this.logger)(
      this.kubeDeployment.rollout(deploymentName, pipelineNamespace),
      `  Waiting for event listener rollout: ${pipelineNamespace}/${deploymentName}`
    );

    return result;
  }

  buildTriggerBindingName(repo: string, branch: string): string {
    return repo.replace('/', '-') + '-' + branch;
  }

  async createTriggerRoute(
    {
      pipelineNamespace,
      name,
    }: {
      pipelineNamespace: string,
      name: string
    }) {

    return this.triggerRoute.createOrUpdate(
      name,
      {
        body: {
          metadata: {
            name: name,
            labels: {
              app: name,
            },
          },
          spec: {
            port: {
              targetPort: 'http-listener'
            },
            tls: {
              termination: 'edge',
              insecureEdgeTerminationPolicy: 'Allow'
            },
            to: {
              kind: 'Service',
              weight: 100,
              name,
            }
          },
        }
      },
      pipelineNamespace,
    );
  }

  async setupDefaultOptions(cliOptions: Partial<RegisterPipelineOptions>) {
    const defaultOptions: RegisterPipelineOptions = {
      templateNamespace: 'tools',
      pipelineNamespace: await this.namespace.getCurrentProject(),
    };

    return Object.assign(
      defaultOptions,
      cliOptions,
    );
  }
}

interface EventListenerHandler {
  createEventListener: (name: string, triggerConfig: TriggerConfig, eventListener: TriggerEventListener<TriggerDefinition>, pipelineNamespace: string) => Promise<TriggerEventListener<TriggerDefinition>>;
}

abstract class BaseEventListenerHandler implements EventListenerHandler {
  readonly logger: Logger;
  readonly triggerEventListener: KubeTektonTriggerEventListener;

  constructor() {
    this.logger = Container.get(Logger);
    this.triggerEventListener = Container.get(KubeTektonTriggerEventListener);
  }

  abstract createEventListener(name: string, triggerConfig: TriggerConfig, eventListener: TriggerEventListener<TriggerDefinition>, pipelineNamespace: string): Promise<TriggerEventListener<TriggerDefinition>>;

  buildTriggerEventListener(version: TriggerDefinitionVersion, name: string, triggerConfig: TriggerConfig, eventListener?: TriggerEventListener<TriggerDefinition>): TriggerEventListener<TriggerDefinition> {
    if (!eventListener) {
      this.logger.log('  Creating new event listener');

      return {
        metadata: {
          name,
          annotations: {
            version: version
          },
          labels: {
            app: name,
          },
        },
        spec: {
          serviceAccountName: triggerConfig.serviceAccount,
          triggers: [this.buildTriggerDefinition(version, triggerConfig)]
        }
      }
    }

    const triggers: TriggerDefinition[] = eventListener.spec.triggers;

    if (!triggers.map(trigger => trigger.name).includes(triggerConfig.name)) {
      const triggerVersion = this.determineTriggerVersion(eventListener);

      const updatedTriggers = [...triggers, this.buildTriggerDefinition(triggerVersion, triggerConfig)];

      const spec = Object.assign({}, eventListener.spec, {triggers: updatedTriggers});
      return Object.assign({}, eventListener, {spec});
    }

    return eventListener;
  }

  determineTriggerVersion(eventListener: TriggerEventListener<TriggerDefinition>): TriggerDefinitionVersion {
    const version = _.get(eventListener, 'metadata.annotations.version');

    if (version) {
      return version;
    }

    const triggers = eventListener.spec.triggers;

    const templates = triggers.map((trigger: TriggerDefinition) => trigger.template);
    const bindings = triggers.map((trigger: TriggerDefinition) => trigger.bindings).reduce(
      (result: Array<TriggerBindings>, current: TriggerBindingsArrays) => {
        result.push(...current);
        return result;
      },
      []);

    if (templates.some(template => isTriggerTemplate_v1_14(template))) {
      return TriggerDefinitionVersion.V1_14;
    }

    if (bindings.some(binding => isTriggerBinding_v0_6(binding))) {
      return TriggerDefinitionVersion.V0_6;
    }

    return TriggerDefinitionVersion.V0_4;
  }

  buildTriggerDefinition(version: TriggerDefinitionVersion, {name, triggerBinding, triggerTemplate, filter}: {name: string, triggerBinding: string, triggerTemplate: string, filter: string}): TriggerDefinition {
    if (version === TriggerDefinitionVersion.V1_14) {
      return {
        name: name,
        bindings: [{
          ref: triggerBinding,
        }],
        template: {
          ref: triggerTemplate
        },
        interceptors: [{
          cel: {
            filter: filter
          }
        }]
      }
    } else if (version === TriggerDefinitionVersion.V0_6) {
      return {
        name: name,
        bindings: [{
          ref: triggerBinding,
        }],
        template: {
          name: triggerTemplate
        },
        interceptors: [{
          cel: {
            filter: filter
          }
        }]
      }
    }

    return {
      name: name,
      bindings: [{
        name: triggerBinding
      }],
      template: {
        name: triggerTemplate
      },
      interceptors: [
        {
          cel: {
            filter: filter
          }
        }
      ]
    }
  }
}

class EventListenerHandlerV1_14 extends BaseEventListenerHandler {
  async createEventListener(name: string, triggerConfig: TriggerConfig, eventListener: TriggerEventListener<TriggerDefinition>, pipelineNamespace: string): Promise<TriggerEventListener<TriggerDefinition>> {
    const body: TriggerEventListener<TriggerDefinition> = this.buildTriggerEventListener(
      TriggerDefinitionVersion.V1_14,
      name,
      triggerConfig,
      eventListener,
    );

    return this.triggerEventListener.createOrUpdate(
      name,
      {body},
      pipelineNamespace,
    );
  }
}

class EventListenerHandlerV0_6 extends BaseEventListenerHandler {
  async createEventListener(name: string, triggerConfig: TriggerConfig, eventListener: TriggerEventListener<TriggerDefinition>, pipelineNamespace: string): Promise<TriggerEventListener<TriggerDefinition>> {
    const body: TriggerEventListener<TriggerDefinition> = this.buildTriggerEventListener(
      TriggerDefinitionVersion.V0_6,
      name,
      triggerConfig,
      eventListener,
    );

    return this.triggerEventListener.createOrUpdate(
      name,
      {body},
      pipelineNamespace,
    );
  }
}

class EventListenerHandlerV0_4 extends BaseEventListenerHandler {
  async createEventListener(name: string, triggerConfig: TriggerConfig, eventListener: TriggerEventListener<TriggerDefinition>, pipelineNamespace: string): Promise<TriggerEventListener<TriggerDefinition>> {
    const body: TriggerEventListener<TriggerDefinition> = this.buildTriggerEventListener(
      TriggerDefinitionVersion.V0_4,
      name,
      triggerConfig,
      eventListener,
    );

    return this.triggerEventListener.createOrUpdate(
      name,
      {body},
      pipelineNamespace,
    );
  }
}
