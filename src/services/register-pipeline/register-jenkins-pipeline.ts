import {Inject, Provides} from 'typescript-ioc';
import * as chalk from 'chalk';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {RegisterIksPipeline} from './register-iks-pipeline';
import {RegisterOpenshiftPipeline} from './register-openshift-pipeline';
import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';
import {RegisterPipelineType} from './register-pipeline-type';
import {CreateGitSecret, GitParams} from '../git-secret';
import {
  CreateWebhook,
  CreateWebhookErrorTypes,
  CreateWebhookOptions,
  GitConfig,
  isCreateWebhookError
} from '../create-webhook';
import {ClusterType} from '../../util/cluster-type';
import {KubeNamespace} from '../../api/kubectl/namespace';
import {NamespaceMissingError, PipelineNamespaceNotProvided} from './register-pipeline';

const noopNotifyStatus: (status: string) => void = () => {};

const REGISTER_PIPELINE_ERROR_TYPES: {[key: string]: ErrorType} = {
  WEBHOOK: {name: 'WEBHOOK', severity: ErrorSeverity.WARNING}
}

class WebhookError extends CommandError {
  constructor(message: string) {
    super(message, REGISTER_PIPELINE_ERROR_TYPES.WEBHOOK);
  }
}

export abstract class RegisterPipeline {
  async abstract registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus?: (status: string) => void);
}

@Provides(RegisterPipeline)
export class RegisterJenkinsPipeline implements RegisterPipeline {
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

  async registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

    const {clusterType, serverUrl} = await this.clusterType.getClusterType(cliOptions.templateNamespace);

    const options: RegisterPipelineOptions = await this.setupDefaultOptions(clusterType, serverUrl, cliOptions);

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

    notifyStatus('Registering pipeline: ' + gitParams.name);
    const gitConfig: GitConfig = this.createWebhook.extractGitConfig(gitParams.url);

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

  async setupDefaultOptions(clusterType: string, serverUrl: string, cliOptions: RegisterPipelineOptions): Promise<RegisterPipelineOptions> {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return Object.assign(
      {},
      await pipeline.setupDefaultOptions(),
      cliOptions,
      {serverUrl},
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
