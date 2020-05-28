import { Inject } from 'typescript-ioc';
import * as chalk from 'chalk';
import inquirer from 'inquirer';

import { CreateGitSecret, CreateGitSecretOptions, GitParams } from '../git-secret';
import { KubeTektonPipelineResource, TektonPipelineResource } from '../../api/kubectl/tekton-pipeline-resource';
import { KubeBody } from '../../api/kubectl/kubernetes-resource-manager';
import { ConfigMap, KubeConfigMap } from '../../api/kubectl';
import { RegisterPipeline, RegisterPipelineOptions } from './index';
import { KubeTektonPipelineRun } from '../../api/kubectl/tekton-pipeline-run';
import { KubeTektonTriggerTemplate, TriggerTemplate } from '../../api/kubectl/tekton-trigger-template';
import { KubeTektonTriggerBinding, TriggerBinding } from '../../api/kubectl/tekton-trigger-binding';
import { KubeTektonTriggerEventListener } from '../../api/kubectl/tekton-trigger-event-listener';
import { OcpRoute, Route } from '../../api/kubectl/route';
import { KubeTektonPipeline, TektonPipeline } from '../../api/kubectl/tekton-pipeline';
import { QuestionBuilder, QuestionBuilderImpl } from '../../util/question-builder';
import { CreateServiceAccount } from '../create-service-account/create-service-account';
import { RoleRule } from '../../api/kubectl/role';
import { ClusterType } from '../../util/cluster-type';
import { NamespaceMissingError, PipelineNamespaceNotProvided } from './register-pipeline';
import { KubeNamespace } from '../../api/kubectl/namespace';
import ChoiceOption = inquirer.objects.ChoiceOption;
import { KubeTektonTask } from '../../api/kubectl/tekton-task';
import { Namespace as NamespaceService } from '../namespace';

const noopNotifyStatus = (test: string) => undefined;

export interface TektonPipelineOptions {
  pipelineNamespace?: string;
  templateNamespace?: string;
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

export class RegisterTektonPipeline implements RegisterPipeline {
  @Inject
  createGitSecret: CreateGitSecret;
  @Inject
  kubeNamespace: KubeNamespace;
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
  triggerRoute: OcpRoute
  @Inject
  pipeline: KubeTektonPipeline;
  @Inject
  tektonTask: KubeTektonTask;
  @Inject
  configMap: KubeConfigMap;
  @Inject
  serviceAccount: CreateServiceAccount;
  @Inject
  clusterType: ClusterType;
  @Inject
  namespace: NamespaceService;

  async registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (text: string) => void = noopNotifyStatus) {

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

    notifyStatus('Creating Git PipelineResource');
    const gitSource = await this.createGitPipelineResource(options, gitParams);

    notifyStatus('Creating Image PipelineResource');
    const dockerImage = await this.createImagePipelineResource(options, gitParams);

    const pipelineName = await this.getPipelineName(options.templateNamespace, options.pipelineName);

    if (pipelineName !== 'none') {
      notifyStatus(`Copying tasks from ${options.templateNamespace}`);
      await this.tektonTask.copyAll({ namespace: options.templateNamespace }, options.pipelineNamespace);

      const name = this.generatePipelineName(gitParams);
      const pipelineValue: TektonPipeline = await this.pipeline.copy(
        pipelineName,
        options.templateNamespace,
        options.pipelineNamespace,
        name
      );
      notifyStatus(`Copied Pipeline from ${options.templateNamespace}/${pipelineName} to ${options.pipelineNamespace}/${pipelineValue.metadata.name}`);

      notifyStatus(`Creating PipelineRun for pipeline: ${pipelineValue.metadata.name}`);
      await this.createPipelineRun({
        name,
        gitSource,
        dockerImage,
        pipelineName: pipelineValue.metadata.name,
        pipelineNamespace: options.pipelineNamespace,
        serviceAccount
      });
      notifyStatus(`Creating TriggerTemplate for pipeline: ${pipelineValue.metadata.name}`);
      const triggerTemplateValue: TriggerTemplate = await this.createTriggerTemplate({
        name,
        dockerImage,
        pipelineName: pipelineValue.metadata.name,
        pipelineNamespace: options.pipelineNamespace
      });
      notifyStatus(`Creating TriggerBinding for pipeline: ${pipelineValue.metadata.name}`);
      const triggerBindingValue: TriggerBinding = await this.createTriggerBinding({
        name,
        pipelineNamespace: options.pipelineNamespace,
        gitParams: gitParams
      });
      notifyStatus(`Creating TriggerEventListener for pipeline: ${pipelineValue.metadata.name}`);
      await this.createTriggerEventListener({
        name,
        pipelineNamespace: options.pipelineNamespace,
        serviceAccount,
        triggerTemplate: triggerTemplateValue.metadata.name,
        triggerBinding: triggerBindingValue.metadata.name,
        gitParams: gitParams
      });
      notifyStatus(`Creating Route for pipeline: ${pipelineValue.metadata.name}`);
      const triggerRouteValue: Route = await this.createTriggerRoute({
        name: `el-${name}`,
        pipelineNamespace: options.pipelineNamespace,
      });
      notifyStatus(`Create Webhook on git repository with url: https://${triggerRouteValue.spec.host}`);

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

  async createGitPipelineResource({ pipelineNamespace = 'dev' }: TektonPipelineOptions, gitParams: GitParams): Promise<string> {
    const name = `${gitParams.repo}-git`.toLowerCase();

    const gitResourceParams = {
      url: gitParams.url,
      revision: gitParams.branch,
    };

    await this.pipelineResource.createOrUpdate(
      name,
      this.buildGitPipelineResourceBody(name, gitResourceParams),
      pipelineNamespace
    );

    return name;
  }

  buildGitPipelineResourceBody(name: string, gitParams: { url: string, revision: string, username?: string, password?: string }): KubeBody<TektonPipelineResource> {

    const params = Object.keys(gitParams)
      .filter(key => !!gitParams[key])
      .map(key => ({
        name: key,
        value: gitParams[key],
      }));

    return {
      body: {
        metadata: {
          name,
        },
        spec: {
          type: 'git',
          params,
        }
      }
    }
  }

  async createImagePipelineResource({ pipelineNamespace = 'dev', templateNamespace = 'tools' }: TektonPipelineOptions, params: { repo: string }): Promise<string> {
    const name = `${params.repo}-image`.toLowerCase();
    const imageUrl: string = await this.buildImageUrl({ pipelineNamespace, templateNamespace }, params);

    await this.pipelineResource.createOrUpdate(
      name,
      this.buildImagePipelineResourceBody(name, imageUrl),
      pipelineNamespace
    );

    return name;
  }

  async buildImageUrl(options: TektonPipelineOptions, params: { repo: string }): Promise<string> {

    const containerConfig: ConfigMap<IBMCloudConfig> = await this.configMap.get('ibmcloud-config', options.pipelineNamespace);
    if (!containerConfig || !containerConfig.data) {
      throw new Error('Unable to retrieve config map: ibmcloud-config');
    }

    const registryUrl = containerConfig.data.REGISTRY_URL;
    // Not sure of pipelineNamespace is the right default...
    const registryNamespace = containerConfig.data.REGISTRY_NAMESPACE || options.pipelineNamespace;

    return `${registryUrl}/${registryNamespace}/${params.repo}:latest`;
  }

  buildImagePipelineResourceBody(name: string, url: string): KubeBody<TektonPipelineResource> {
    return {
      body: {
        metadata: {
          name,
        },
        spec: {
          type: 'image',
          params: [
            {
              name: 'url',
              value: url.toLowerCase(),
            }
          ],
        },
      },
    };
  }

  async getPipelineName(namespace: string, pipelineName?: string): Promise<string> {
    const pipelines: TektonPipeline[] = await this.pipeline.list({ namespace });

    const pipelineChoices: Array<ChoiceOption<{ pipelineName: string }>> = pipelines
      .map(pipeline => pipeline.metadata.name)
      .map(name => ({ name, value: name }));

    if (pipelineChoices.length === 0) {
      console.log(`No Pipelines found in ${namespace} namespace. Skipping PipelineRun creation`);
      console.log('Install Tekton tasks and pipelines into your namespace by running: ' + chalk.yellow(`igc namespace ${namespace} --tekton`));
      return 'none';
    }

    const questionBuilder: QuestionBuilder<{ pipelineName: string }> = new QuestionBuilderImpl()
      .question({
        type: 'list',
        choices: pipelineChoices.concat({ name: 'Skip PipelineRun creation', value: 'none' }),
        name: 'pipelineName',
        message: 'Select the Pipeline to use in the PipelineRun:',
      }, pipelineName);

    return questionBuilder.prompt()
      .then(result => result.pipelineName);
  }

  async createPipelineRun(
    {
      pipelineNamespace,
      name,
      gitSource,
      dockerImage,
      pipelineName,
      serviceAccount,
    }: {
      pipelineNamespace: string,
      name: string,
      gitSource: string,
      dockerImage: string,
      pipelineName: string,
      serviceAccount?: string,
    }) {
    const dateHex = Date.now().toString(16).substring(0, 6);
    const pipelineRunName = `${name}-${dateHex}`;

    return this.pipelineRun.create(
      pipelineRunName,
      {
        body: {
          metadata: {
            name: pipelineRunName,
            labels: {
              app: name,
            },
          },
          spec: {
            pipelineRef: {
              name: pipelineName,
            },
            resources: [
              {
                name: 'git-source',
                resourceRef: {
                  name: gitSource,
                },
              },
              {
                name: 'docker-image',
                resourceRef: {
                  name: dockerImage,
                },
              },
            ],
            serviceAccountName: serviceAccount,
          },
        }
      },
      pipelineNamespace,
    );
  }
  async createTriggerTemplate(
    {
      pipelineNamespace,
      name,
      dockerImage,
      pipelineName,
    }: {
      pipelineNamespace: string,
      name: string,
      dockerImage: string,
      pipelineName: string,
    }) {

    return this.triggerTemplate.create(
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
              {
                apiVersion: 'tekton.dev/v1alpha1',
                kind: 'PipelineRun',
                metadata: {
                  generateName: `${pipelineName}-`
                },
                spec: {
                  pipelineRef: {
                    name: pipelineName
                  },
                  resources: [
                    {
                      name: 'docker-image',
                      resourceRef: {
                        name: dockerImage
                      }
                    },
                    {
                      name: 'git-source',
                      resourceSpec: {
                        type: 'git',
                        params: [
                          {
                            name: 'revision',
                            value: '$(params.gitrevision)'
                          },
                          {
                            name: 'url',
                            value: '$(params.gitrepositoryurl)'
                          }
                        ]
                      }
                    }
                  ]
                }
              }
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
      gitParams
    }: {
      pipelineNamespace: string,
      name: string,
      gitParams: GitParams
    }) {
    // default to github
    let gitrevision = '$(body.head_commit.id)'
    let gitrepositoryurl = '$(body.repository.url)'
    if (gitParams.url.indexOf('github') < 0) {
      // handle as gitlab
      gitrevision = '$(body.checkout_sha)'
      gitrepositoryurl = '$(body.repository.git_http_url)'
    }
    return this.triggerBinding.create(
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
                value: gitrevision
              },
              {
                name: 'gitrepositoryurl',
                value: gitrepositoryurl
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
      gitParams
    }: {
      pipelineNamespace: string,
      name: string,
      serviceAccount: string,
      triggerTemplate: string,
      triggerBinding: string,
      gitParams: GitParams
    }) {
    // default to github
    let headerEvent = "header.match('X-GitHub-Event', 'push')"
    if (gitParams.url.indexOf('github') < 0) {
      // handle as gitlab
      headerEvent = "header.match('X-GitLab-Event', 'Push Hook')"
    }
    const filter = `${headerEvent} && body.ref == 'refs/heads/${gitParams.branch}'`
    return this.triggerEventListener.create(
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
            serviceAccountName: serviceAccount,
            triggers: [
              {
                name: name,
                binding: {
                  name: triggerBinding
                },
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
      },
      pipelineNamespace,
    );
  }
  async createTriggerRoute(
    {
      pipelineNamespace,
      name,
    }: {
      pipelineNamespace: string,
      name: string
    }) {

    return this.triggerRoute.create(
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
              termination: 'edge'
            },
            to: {
              kind: 'Service',
              weight: 100,
              name: name
            }
          },
        }
      },
      pipelineNamespace,
    );
  }
  async setupDefaultOptions(cliOptions: RegisterPipelineOptions) {
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
