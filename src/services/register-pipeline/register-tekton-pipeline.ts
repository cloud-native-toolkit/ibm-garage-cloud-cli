import {Container, Inject} from 'typescript-ioc';
import {ChoiceOptions} from 'inquirer';
import * as chalk from 'chalk';
import {get} from 'superagent';

import {
  NamespaceMissingError,
  PipelineNamespaceNotProvided,
  RegisterPipeline,
  RegisterPipelineOptions,
  WebhookError
} from './register-pipeline.api';
import {Namespace as NamespaceService} from '../namespace';
import {CreateGitSecret, GitParams} from '../git-secret';
import {
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
  TektonPipelineRun,
  TemplateKubeMetadata,
  TriggerBinding,
  TriggerEventListener,
  TriggerEventListener_v0_6,
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
  GitHeader,
  isCreateWebhookError,
  WebhookParams
} from '../../api/git'

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
  scanImage?: boolean;
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

    notifyStatus('Getting git parameters');
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

    const serviceAccount = await this.createServiceAccount(options.pipelineNamespace, clusterType, [secretName], notifyStatus);

    const pipelineArgs: PipelineArgs | {} = await this.getPipelineArgs(options.templateNamespace, options.pipelineName);

    if (isPipelineArgs(pipelineArgs)) {
      const templatePipelineName = pipelineArgs.pipelineName;
      const scanImage = pipelineArgs.scanImage;

      notifyStatus(`Copying tasks from ${options.templateNamespace}`);
      await this.tektonTask.copyAll({ namespace: options.templateNamespace }, options.pipelineNamespace);

      const pipelineName: string = await this.pipeline.copy(
        templatePipelineName,
        options.templateNamespace,
        options.pipelineNamespace,
        this.generatePipelineName(gitParams),
      ).then(pipelineValue => pipelineValue.metadata.name);
      notifyStatus(`Copied Pipeline from ${options.templateNamespace}/${templatePipelineName} to ${options.pipelineNamespace}/${pipelineName}`);

      const pipelineRunBuilder = this.buildPipelineRunBuilder({
        pipelineName: pipelineName,
        scanImage,
      });

      notifyStatus(`Creating TriggerTemplate for pipeline: ${pipelineName}`);
      const triggerTemplateValue: TriggerTemplate = await this.createTriggerTemplate({
        name: pipelineName,
        pipelineNamespace: options.pipelineNamespace,
        pipelineRunBuilder,
      });

      const gitApi: GitApi = await apiFromUrl(gitParams.url, gitParams, gitParams.branch);

      notifyStatus(`Creating TriggerBinding for pipeline: ${pipelineName}`);
      const triggerBindingValue: TriggerBinding = await this.createTriggerBinding({
        name: pipelineName,
        pipelineNamespace: options.pipelineNamespace,
        gitApi,
      });

      notifyStatus(`Creating TriggerEventListener for pipeline: ${pipelineName}`);
      await this.createTriggerEventListener({
        name: pipelineName,
        pipelineNamespace: options.pipelineNamespace,
        serviceAccount,
        triggerTemplate: triggerTemplateValue.metadata.name,
        triggerBinding: triggerBindingValue.metadata.name,
        gitApi,
      });

      notifyStatus(`Creating Route for pipeline: ${pipelineName}`);
      const triggerRouteValue: Route = await this.createTriggerRoute({
        name: `el-${pipelineName}`,
        pipelineNamespace: options.pipelineNamespace,
      });

      notifyStatus(`Creating PipelineRun for pipeline: ${pipelineName}`);
      await this.createPipelineRun(
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
        });
      } catch (err) {
        if (isCreateWebhookError(err) && err.errorType === CreateWebhookErrorTypes.alreadyExists) {
          throw new WebhookError('Webhook already exists for this trigger in this repository.');
        }  else {
          throw new WebhookError(
            `Error creating webhook.
  Check your access token is correct and that it has permission to create webhooks.
  The webhook can be manually created by sending push events to ${chalk.yellow(webhookUrl)}}`)
        }
      }
    }
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

  async getPipelineArgs(namespace: string, pipelineName?: string): Promise<PipelineArgs> {
    const pipelines: TektonPipeline[] = await this.pipeline.list({ namespace });

    const pipelineChoices: Array<ChoiceOptions<{ pipelineName: string }>> = pipelines
      .map(pipeline => pipeline.metadata.name)
      .map(name => ({ name, value: name }));

    if (pipelineChoices.length === 0) {
      console.log(`No Pipelines found in ${namespace} namespace. Skipping PipelineRun creation`);
      console.log('Install Tekton tasks and pipelines into your namespace by following these instructions: ' + chalk.yellow('https://github.com/IBM/ibm-garage-tekton-tasks'));
      return {};
    }

    const questionBuilder: QuestionBuilder<PipelineArgs> = Container.get(QuestionBuilder)
      .question({
        type: 'list',
        choices: pipelineChoices.concat({ name: 'Skip PipelineRun creation', value: 'none' }),
        name: 'pipelineName',
        message: 'Select the Pipeline to use in the PipelineRun:',
      }, pipelineName)
      .question({
        type: 'confirm',
        name: 'scanImage',
        message: 'Would you like to enable the pipeline to scan the image for vulnerabilities?',
        when: (val: Partial<PipelineArgs>) => val.pipelineName !== 'none',
      });

    return questionBuilder.prompt()
      .then(result => result.pipelineName === 'none' ? {} : result);
  }

  buildPipelineRunBuilder(
    {
      pipelineName,
      scanImage = false,
    }: {
      pipelineName: string,
      scanImage?: boolean,
    }
  ): PipelineRunBuilder {

    return ({gitUrl, gitRevision, template}: {gitUrl: string, gitRevision: string, template: boolean}) => {
      const metadata = template ? {generateName: `${pipelineName}-`} : {name: `${pipelineName}-${Date.now().toString(16)}`}

      const result: TektonPipelineRun<KubeMetadata | TemplateKubeMetadata> = Object.assign(
        {
          metadata,
          spec: {
            pipelineRef: {
              name: pipelineName
            },
            params: [
              {
                name: 'git-url',
                value: gitUrl
              },
              {
                name: 'git-revision',
                value: gitRevision
              },
              {
                name: 'scan-image',
                value: '' + scanImage // convert to string
              },
            ]
          }
        },
        template
          ? {apiVersion: 'tekton.dev/v1beta1', kind: 'PipelineRun',}
          : {}
      )

      return result as any;
    };
  }

  async createPipelineRun(pipelineNamespace: string, body: TektonPipelineRun<KubeMetadata>) {
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
                gitRevision: '$(params.gitrevision)',
                gitUrl: '$(params.gitrepositoryurl)',
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

  async createTriggerEventListener(
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

    const filter = `header.match('${webhookParams.headerName}', '${webhookParams.eventName}') && ${webhookParams.refPath} == '${webhookParams.ref}'`

    const triggerVersion: SemVer = await this.getTriggerVersion();
    if (triggerVersion.minor >= 6) {
      const eventListenerV06: TriggerEventListener_v0_6 = {
        metadata: {
          name: name,
          labels: {
            app: name,
            'triggers.tekton.dev/release': `${triggerVersion.major}.${triggerVersion.minor}.${triggerVersion.patch}`
          },
        },
        spec: {
          serviceAccountName: serviceAccount,
          triggers: [
            {
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
          ]
        }
      };

      return this.triggerEventListener.createOrUpdate(
        name,
        {body: eventListenerV06},
        pipelineNamespace,
      );
    } else {
      const eventListener: TriggerEventListener = {
        metadata: {
          name: name,
          labels: {
            app: name,
            'triggers.tekton.dev/release': `${triggerVersion.major}.${triggerVersion.minor}.${triggerVersion.patch}`
          },
        },
        spec: {
          serviceAccountName: serviceAccount,
          triggers: [
            {
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
          ]
        },
      }

      return this.triggerEventListener.createOrUpdate(
        name,
        {
          body: eventListener,
        },
        pipelineNamespace,
      );
    }
  }

  async getTriggerVersion(): Promise<SemVer> {
    const version = await this.kubeDeployment.getLabel('tekton-triggers-controller', 'triggers.tekton.dev/release', 'openshift-pipelines');
    if (!version) {
      return {major: 0, minor: 4, patch: 0};
    }

    const versionNumbers: string[] = version.replace('v', '').split('.');
    if (versionNumbers.length < 3) {
      return {major: 0, minor: 4, patch: 0};
    }

    const major = +versionNumbers[0];
    const minor = +versionNumbers[1];
    const patch = +versionNumbers[2];

    return {major, minor, patch};
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
