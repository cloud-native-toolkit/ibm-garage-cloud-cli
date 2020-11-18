import {Inject} from 'typescript-ioc';
import * as chalk from 'chalk';

import {
  NamespaceMissingError,
  PipelineNamespaceNotProvided,
  RegisterPipeline,
  RegisterPipelineOptions, WebhookError
} from './register-pipeline.api';
import {RegisterIksPipeline, RegisterOpenshiftPipeline, RegisterPipelineType} from './jenkins';
import {CreateWebhook, CreateWebhookOptions} from '../create-webhook';
import {CreateGitSecret, GitConfig, GitParams} from '../git-secret';
import {Namespace as NamespaceService} from '../namespace';
import {gitRepoConfigFromUrl, isCreateWebhookError, TypedGitRepoConfig, UnknownWebhookError, WebhookAlreadyExists, CreateWebhookErrorTypes} from '../../api/git'
import {KubeConfigMap, KubeNamespace, KubeSecret} from '../../api/kubectl';
import {ClusterType} from '../../util/cluster-type';
import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';

const noopNotifyStatus: (status: string) => void = () => {};

export class RegisterJenkinsPipelineImpl implements RegisterPipeline {
  @Inject
  private createGitSecret: CreateGitSecret;
  @Inject
  private createWebhook: CreateWebhook;
  @Inject
  private kubeConfigMap: KubeConfigMap;
  @Inject
  private kubeSecret: KubeSecret;
  @Inject
  private iksPipeline: RegisterIksPipeline;
  @Inject
  private openshiftPipeline: RegisterOpenshiftPipeline;
  @Inject
  private kubeNamespace: KubeNamespace;
  @Inject
  private clusterType: ClusterType;
  @Inject
  private namespaceService: NamespaceService;

  async registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

    const templateConfig = await this.clusterType.getClusterType(cliOptions.templateNamespace);

    const options: RegisterPipelineOptions = await this.setupDefaultOptions(
      cliOptions
    );

    const {clusterType, serverUrl} = await this.clusterType.getClusterType(options.pipelineNamespace);

    options.serverUrl = serverUrl;

    notifyStatus(`Creating pipeline on ${chalk.yellow(clusterType)} cluster in ${chalk.yellow(options.pipelineNamespace)} namespace`);

    if (!options.pipelineNamespace) {
      throw new PipelineNamespaceNotProvided('A pipeline namespace must be provided', clusterType);
    }

    if (!(await this.kubeNamespace.exists(options.pipelineNamespace))) {
      throw new NamespaceMissingError('The pipeline namespace does not exist: ' + cliOptions.pipelineNamespace, clusterType);
    }

    notifyStatus('Creating secret(s) with git credentials');
    const {gitParams, secretName, configMapName} = await this.createGitSecret.getParametersAndCreateSecret(
      Object.assign(
        {},
        options,
        {
          namespaces: [
            options.pipelineNamespace,
            options.templateNamespace,
          ],
          replace: options.replaceGitSecret,
        },
      ),
      notifyStatus,
    );

    notifyStatus('Setting up Jenkins environment');
    await this.namespaceService.setupJenkins(options.pipelineNamespace, options.templateNamespace, clusterType, notifyStatus);

    notifyStatus('Registering pipeline: ' + gitParams.name);
    const gitConfig: TypedGitRepoConfig = await gitRepoConfigFromUrl(gitParams.url, gitParams);

    const pipelineResult = await this.executeRegisterPipeline(
      clusterType,
      options,
      Object.assign({}, gitParams, {type: gitConfig.type}),
      gitParams.name,
      secretName,
    );

    if (!options.skipWebhook) {
      notifyStatus('Creating git webhook');

      try {
        await this.createWebhook.createWebhook(this.buildCreateWebhookOptions(gitParams, pipelineResult));
      } catch (err) {
        if (isCreateWebhookError(err) && err.errorType === CreateWebhookErrorTypes.alreadyExists) {
          throw new WebhookError('Webhook already exists for this repository.');
        }  else {
          throw new WebhookError(
            `Error creating webhook. The webhook can be manually created by sending push events to ${pipelineResult.jenkinsUrl}`)
        }
      }
    }
  }

  async setupDefaultOptions(cliOptions: RegisterPipelineOptions): Promise<RegisterPipelineOptions> {
    return Object.assign(
      {},
      {
        templateNamespace: 'tools',
        pipelineNamespace: await this.namespaceService.getCurrentProject(),
      },
      cliOptions,
    );
  }

  getPipelineType(clusterType: string): RegisterPipelineType {
    return clusterType === 'openshift' ? this.openshiftPipeline : this.iksPipeline;
  }

  async executeRegisterPipeline(clusterType: 'openshift' | 'kubernetes', options: RegisterPipelineOptions, gitParams: GitParams, pipelineName: string, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string }> {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return pipeline.registerPipeline(options, gitParams, pipelineName, credentialsName);
  }

  buildCreateWebhookOptions(gitParams: GitParams, pipelineResult: {jenkinsUrl: string; jenkinsUser: string; jenkinsPassword: string, jobName: string, webhookUrl?: string}): CreateWebhookOptions {

    return Object.assign(
      {
        gitUrl: gitParams.url,
        gitUsername: gitParams.username,
        gitToken: gitParams.password
      },
      pipelineResult,
    );
  }
}
