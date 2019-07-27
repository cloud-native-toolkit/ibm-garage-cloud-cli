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

// set these variables here so they can be replaced by rewire
let executeRegisterIksPipeline = iksPipeline.registerPipeline;
let executeRegisterOpenShiftPipeline = openshiftPipeline.registerPipeline;
let readFilePromise = fileUtil.readFile;
let getSecretData = secrets.getSecretData;

const noopNotifyStatus: (status: string) => void = () => {};

export async function registerPipeline(options: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

  const gitParams: GitParams = await getGitParameters(options);

  notifyStatus('Creating git secret');

  const secret: Secret = await createGitSecret(gitParams, options.namespace, await readValuesFile(options.values));

  notifyStatus('Registering pipeline');

  const pipelineResult = await executeRegisterPipeline(options, gitParams);

  if (!options.skipWebhook) {
    notifyStatus('Creating git webhook');
    await createWebhook(buildCreateWebhookOptions(gitParams, pipelineResult));
  }
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

async function executeRegisterPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {
  if ('openshift' === await getClusterType()) {
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
