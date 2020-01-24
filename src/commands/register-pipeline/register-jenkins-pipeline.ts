import {Inject, Provides} from 'typescript-ioc';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {
    CreateWebhook,
    CreateWebhookErrorTypes,
    CreateWebhookOptions,
    GitConfig,
    isCreateWebhookError
} from '../create-webhook';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {RegisterIksPipeline} from './register-iks-pipeline';
import {RegisterOpenshiftPipeline} from './register-openshift-pipeline';
import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';
import {RegisterPipelineType} from './register-pipeline-type';
import {Namespace} from '../namespace';
import {CreateGitSecret, GitParams} from '../git-secret';

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
  private namespaceBuilder: Namespace;

  async registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

    const {clusterType, serverUrl} = await this.getClusterType(cliOptions.templateNamespace);

    const options: RegisterPipelineOptions = this.setupDefaultOptions(clusterType, serverUrl, cliOptions);

    notifyStatus('Creating secret(s) with git credentials');

    const gitParams: GitParams = await this.createGitSecret.getGitParameters(options, notifyStatus);

    await this.setupNamespace(options.pipelineNamespace, options.templateNamespace, notifyStatus);

    await this.createGitSecret.createGitSecret(
      gitParams,
      [
        options.pipelineNamespace,
        options.templateNamespace,
      ],
      options.values,
    );

    notifyStatus('Registering pipeline: ' + gitParams.name);

    const gitConfig: GitConfig = this.createWebhook.extractGitConfig(gitParams.url);

    const pipelineResult = await this.executeRegisterPipeline(
      clusterType,
      options,
      Object.assign({}, gitParams, {type: gitConfig.type}),
      gitParams.name.toLowerCase(),
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

  setupDefaultOptions(clusterType: string, serverUrl: string, cliOptions: RegisterPipelineOptions): RegisterPipelineOptions {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return Object.assign(
      {},
      pipeline.setupDefaultOptions(),
      cliOptions,
      {serverUrl},
    );
  }

  getPipelineType(clusterType: string): RegisterPipelineType {
    return clusterType === 'openshift' ? this.openshiftPipeline : this.iksPipeline;
  }

  async executeRegisterPipeline(clusterType: 'openshift' | 'kubernetes', options: RegisterPipelineOptions, gitParams: GitParams, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string }> {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return pipeline.registerPipeline(options, gitParams, credentialsName);
  }

  async getClusterType(namespace = 'tools'): Promise<{clusterType: 'openshift' | 'kubernetes', serverUrl?: string}> {
    try {
      const configMap = await this.kubeConfigMap.getData<{ CLUSTER_TYPE: 'openshift' | 'kubernetes', SERVER_URL?: string }>(
        'ibmcloud-config',
        namespace,
      );

      return {clusterType: configMap.CLUSTER_TYPE, serverUrl: configMap.SERVER_URL};
    } catch (configMapError) {

      console.error('Error getting cluster_type from configMap `ibmcloud-config`. Attempting to retrieve it from the secret');

      try {
        const secret = await this.kubeSecret.getData<{cluster_type: 'openshift' | 'kubernetes'}>('ibmcloud-apikey', namespace);

        return {clusterType: secret.cluster_type ? secret.cluster_type : 'kubernetes'};
      } catch (secretError) {
        console.error('Error getting cluster_type from secret `ibmcloud-apikey`. Defaulting to `kubernetes`');

        return {clusterType: 'kubernetes'};
      }
    }
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

  async setupNamespace(toNamespace: string, fromNamespace: string, notifyStatus: (text: string) => void) {
    if (toNamespace === fromNamespace) {
      return;
    }

    await this.namespaceBuilder.create(toNamespace, fromNamespace, notifyStatus);
  }
}
