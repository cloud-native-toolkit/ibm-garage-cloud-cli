import {parse} from 'dot-properties';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import createWebhook from '../create-webhook/create-webhook';
import {CreateWebhookOptions} from '../create-webhook';
import * as secrets from '../../api/kubectl/secrets';
import {Secret} from '../../api/kubectl/secrets';
import {getGitParameters} from './git-parameters';
import {createGitSecret, GitParams} from './create-git-secret';
import * as iksPipeline from './register-iks-pipeline';
import * as openshiftPipeline from './register-openshift-pipeline';
import * as fileUtil from '../../util/file-util';
import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';

// set these variables here so they can be replaced by rewire
let setupIksDefaultOptions = iksPipeline.setupDefaultOptions;
let executeRegisterIksPipeline = iksPipeline.registerPipeline;
let setupOpenshiftDefaultOptions = openshiftPipeline.setupDefaultOptions;
let executeRegisterOpenShiftPipeline = openshiftPipeline.registerPipeline;
let readFilePromise = fileUtil.readFile;
let getSecretData = secrets.getSecretData;
let copySecret = secrets.copySecret;

const noopNotifyStatus: (status: string) => void = () => {};

const REGISTER_PIPELINE_ERROR_TYPES: {[key: string]: ErrorType} = {
  WEBHOOK: {name: 'WEBHOOK', severity: ErrorSeverity.WARNING}
}

class WebhookError extends CommandError {
  constructor(message: string) {
    super(message, REGISTER_PIPELINE_ERROR_TYPES.WEBHOOK);
  }
}

export async function registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

  const clusterType: 'openshift' | 'kubernetes' = await getClusterType();

  const options: RegisterPipelineOptions = setupDefaultOptions(clusterType, cliOptions);

  const gitParams: GitParams = await getGitParameters(options);

  notifyStatus('Creating git secret');

  const secret: Secret = await createGitSecret(gitParams, options.pipelineNamespace, await readValuesFile(options.values));

  if (options.jenkinsNamespace !== options.pipelineNamespace) {
    notifyStatus(`Copying 'ibmcloud-apikey' secret to ${options.pipelineNamespace}`);

    await copySecret('ibmcloud-apikey', options.jenkinsNamespace, options.pipelineNamespace);
  }

  notifyStatus('Registering pipeline');

  const pipelineResult = await executeRegisterPipeline(clusterType, options, gitParams);

  if (!options.skipWebhook) {
    notifyStatus('Creating git webhook');
    try {
      await createWebhook(buildCreateWebhookOptions(gitParams, pipelineResult));
    } catch (err) {
      throw new WebhookError(
        `Error creating webhook. The webhook can be manually created by sending push events to ${pipelineResult.jenkinsUrl}`)
    }
  }
}

function setupDefaultOptions(clusterType: string, cliOptions: RegisterPipelineOptions): RegisterPipelineOptions {
  return Object.assign(
    {},
    clusterType === 'openshift' ? setupOpenshiftDefaultOptions() : setupIksDefaultOptions(),
    cliOptions,
  )
}

async function readValuesFile(valuesFileName?: string): Promise<any> {
  if (!valuesFileName) {
    return {}
  }

  try {
    const data: Buffer = await readFilePromise(valuesFileName);

    try {
      return JSON.parse(data.toString());
    } catch (err) {
      return parse(data);
    }
  } catch (err) {}

  return {};
}

async function executeRegisterPipeline(clusterType: 'openshift' | 'kubernetes', options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {
  if ('openshift' === clusterType) {
    return executeRegisterOpenShiftPipeline(options, gitParams);
  } else {
    return executeRegisterIksPipeline(options, gitParams);
  }
}

async function getClusterType(): Promise<'openshift' | 'kubernetes'> {
  try {
    const secret = await getSecretData<{ cluster_type: 'openshift' | 'kubernetes' }>(
      'ibmcloud-apikey',
      'tools',
    );

    return secret.cluster_type ? secret.cluster_type : 'kubernetes';
  } catch (err) {
    return 'kubernetes';
  }
}

function buildCreateWebhookOptions(gitParams: GitParams, pipelineResult: {jenkinsUrl: string}): CreateWebhookOptions {

  return Object.assign(
    {
      gitUrl: gitParams.url,
      gitUsername: gitParams.username,
      gitToken: gitParams.password
    },
    pipelineResult,
  );
}
