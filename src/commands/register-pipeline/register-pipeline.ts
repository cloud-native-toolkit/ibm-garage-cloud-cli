import {parse} from 'dot-properties';
import {Inject, Provides} from 'typescript-ioc';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {CreateWebhook, CreateWebhookOptions} from '../create-webhook';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {GitParams, GitSecret} from './create-git-secret';
import * as iksPipeline from './register-iks-pipeline';
import * as openshiftPipeline from './register-openshift-pipeline';
import * as fileUtil from '../../util/file-util';
import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';
import {QueryString} from '../../api/kubectl/kubernetes-resource-manager';
import {GetGitParameters} from './git-parameters';
import {RegisterIksPipeline} from './register-iks-pipeline';
import {RegisterOpenshiftPipeline} from './register-openshift-pipeline';
import {FsPromises} from '../../util/file-util';
import {RegisterPipelineType} from './register-pipeline-type';


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
export class RegisterPipelineImpl {
  @Inject
  private getGitParameters: GetGitParameters;
  @Inject
  private gitSecret: GitSecret;
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
  private fs: FsPromises;

  async registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

    const clusterType: 'openshift' | 'kubernetes' = await this.getClusterType(cliOptions.jenkinsNamespace);

    const options: RegisterPipelineOptions = this.setupDefaultOptions(clusterType, cliOptions);

    const gitParams: GitParams = await this.getGitParameters.getGitParameters(options);

    notifyStatus('Creating git secret');

    await this.gitSecret.create(gitParams, options.pipelineNamespace, await this.readValuesFile(options.values));

    await this.setupNamespace(options.pipelineNamespace, options.jenkinsNamespace, notifyStatus);

    notifyStatus('Registering pipeline');

    const pipelineResult = await this.executeRegisterPipeline(clusterType, options, gitParams);

    if (!options.skipWebhook) {
      notifyStatus('Creating git webhook');

      try {
        await this.createWebhook.createWebhook(this.buildCreateWebhookOptions(gitParams, pipelineResult));
      } catch (err) {
        console.log('Error creating webhook', err);
        throw new WebhookError(
          `Error creating webhook. The webhook can be manually created by sending push events to ${pipelineResult.jenkinsUrl}`)
      }
    }
  }

  setupDefaultOptions(clusterType: string, cliOptions: RegisterPipelineOptions): RegisterPipelineOptions {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return Object.assign(
      {},
      pipeline.setupDefaultOptions(),
      cliOptions,
    );
  }

  getPipelineType(clusterType: string): RegisterPipelineType {
    return clusterType === 'openshift' ? this.openshiftPipeline : this.iksPipeline;
  }

  async readValuesFile(valuesFileName?: string): Promise<any> {
    if (!valuesFileName) {
      return {}
    }

    try {
      const data: Buffer = await this.fs.readFile(valuesFileName);

      try {
        return JSON.parse(data.toString());
      } catch (err) {
        return parse(data);
      }
    } catch (err) {}

    return {};
  }

  async executeRegisterPipeline(clusterType: 'openshift' | 'kubernetes', options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string, jobName: string, jenkinsUser: string, jenkinsPassword: string}> {
    const pipeline: RegisterPipelineType = this.getPipelineType(clusterType);

    return pipeline.registerPipeline(options, gitParams);
  }

  async getClusterType(namespace = 'tools'): Promise<'openshift' | 'kubernetes'> {
    try {
      const configMap = await this.kubeConfigMap.getData<{ CLUSTER_TYPE: 'openshift' | 'kubernetes' }>(
        'ibmcloud-config',
        namespace,
      );

      return configMap.CLUSTER_TYPE ? configMap.CLUSTER_TYPE : 'kubernetes';
    } catch (configMapError) {

      console.error('Error getting cluster_type from configMap `ibmcloud-config`. Attempting to retrieve it from the secret');

      try {
        const secret = await this.kubeSecret.getData<{cluster_type: 'openshift' | 'kubernetes'}>('ibmcloud-apikey', namespace);

        return secret.cluster_type ? secret.cluster_type : 'kubernetes';
      } catch (secretError) {
        console.error('Error getting cluster_type from secret `ibmcloud-apikey`. Defaulting to `kubernetes`');

        return 'kubernetes';
      }
    }
  }

  buildCreateWebhookOptions(gitParams: GitParams, pipelineResult: {jenkinsUrl: string; jenkinsUser: string; jenkinsPassword: string, jobName: string}): CreateWebhookOptions {

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

    const qs: QueryString = {labelSelector: 'group=catalyst-tools'};

    notifyStatus(`Copying 'secrets to ${toNamespace}`);
    const secrets = await this.kubeSecret.copyAll({namespace: fromNamespace, qs}, toNamespace);
    console.log(`   Copied ${secrets.length} secrets`);

    notifyStatus(`Copying configmaps to ${toNamespace}`);
    const configmaps = await this.kubeConfigMap.copyAll({namespace: fromNamespace, qs}, toNamespace);
    console.log(`   Copied ${configmaps.length} configmaps`);
  }
}
