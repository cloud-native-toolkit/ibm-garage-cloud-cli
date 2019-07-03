import * as fs from 'fs';
import * as path from 'path';

import * as superagent from 'superagent';
import * as inquirer from 'inquirer';
import {Client1_13 as Client} from 'kubernetes-client';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {checkKubeconfig} from '../../util/kubernetes';
import createWebhook from '../create-webhook/create-webhook';
import {CreateWebhookOptions} from '../create-webhook';
import {execPromise, ExecResult} from '../../util/child_process';
import {buildKubeClient, getSecretData} from '../../api/kubectl/secrets';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';

let prompt = inquirer.prompt;

class GitParams {
  name: string;
  url: string;
  username: string;
  password: string;
  branch: string;
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function registerPipeline(options: RegisterPipelineOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {

  await checkKubeconfig();

  const gitParams = await getGitParameters(options);

  notifyStatus('Creating git secret');

  await createGitSecret(gitParams, options.namespace);

  notifyStatus('Registering pipeline');

  const pipelineResult = await executeRegisterPipeline(options, gitParams);

  if (!options.skipWebhook) {
    notifyStatus('Creating git webhook');
    await createWebhook(buildCreateWebhookOptions(gitParams, pipelineResult));
  }
}

/*
########## Start: Git Parameters ##########
*/

async function getGitParameters(options: RegisterPipelineOptions = {}): Promise<GitParams> {

  const parsedGitUrl = parseGitUrl(await getRemoteGitUrl(options.workingDir));

  const questions: inquirer.Questions<{username: string; password: string}> = [{
    type: 'input',
    name: 'username',
    message: `Please provide username for ${parsedGitUrl.url}:`,
    default: options.gitUsername,
  }, {
    type: 'password',
    name: 'password',
    message: `Please provide your password/personal access token:`,
    default: options.gitPat,
  }];

  const answers = await prompt(questions);

  return {
    url: parsedGitUrl.url,
    name: `${parsedGitUrl.org}.${parsedGitUrl.repo}`,
    username: answers.username,
    password: answers.password,
    branch: 'master',
  };
}

const GIT_URL_PATTERNS = {
  'http': 'https{0,1}://.*/(.*)/(.*).git',
  'git@': 'git@.*:(.*)/(.*).git'
};

function parseGitUrl(url: string): {url: string; org: string; repo: string} {
  const pattern = GIT_URL_PATTERNS[url.substring(0, 4)];

  if (!pattern) {
    throw new Error('invalid git url');
  }

  const results = new RegExp(pattern, 'gi')
    .exec(url.endsWith('.git') ? url : `${url}.git`);

  if (!results || results.length < 3) {
    throw new Error('invalid git url');
  }

  const org = results[1];
  const repo = results[2];

  return {
    url,
    org,
    repo
  };
}

async function getRemoteGitUrl(workingDir: string = process.cwd()): Promise<string> {
  return execPromise(
    'git remote get-url origin',
    {
      cwd: workingDir
    },
  ).then(({stdout}: ExecResult) => stdout.toString().trim());
}

/*
********** End: Git Parameters **********
*/

async function createGitSecret(gitParams: GitParams, namespace: string = 'tools') {
  const client = buildKubeClient();

  try {
    await client.api.v1.namespaces(namespace).secret(gitParams.name).get();

    const result = await client.api.v1.namespaces(namespace).secret(gitParams.name).put({
      body: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: gitParams.name,
          labels: {
            'jenkins.io/credentials-type': 'usernamePassword'
          },
          annotations: {
            description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
            'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
          },
        },
        type: 'Opaque',
        stringData: gitParams,
      }
    });

    return result.body;
  } catch (err) {
    const result = await client.api.v1.namespaces(namespace).secrets.post({
      body: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: gitParams.name,
          labels: {
            'jenkins.io/credentials-type': 'usernamePassword'
          },
          annotations: {
            description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
            'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
          },
        },
        type: 'Opaque',
        stringData: gitParams,
      }
    });

    return result.body;
  }
}

/*
########## Start: Execute Register Pipeline ##########
*/
async function executeRegisterPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

  const jenkinsAccess = await pullJenkinsAccessSecrets(options.namespace || 'tools');

  const jobName = gitParams.branch !== 'master'
    ? `${gitParams.name}_${gitParams.branch}`
    : gitParams.name;

  try {
    const response: superagent.Response = await superagent
      .post(`${jenkinsAccess.url}/createItem?name=${jobName}`)
      .auth(jenkinsAccess.username, jenkinsAccess.api_token)
      .set(await generateJenkinsCrumbHeader(jenkinsAccess))
      .set('User-Agent', `${jenkinsAccess.username} via ibm-garage-cloud cli`)
      .set('Content-Type', 'text/xml')
      .send(await buildJenkinsJobConfig(gitParams));

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Unable to create Jenkins job: ${response.text}`);
    }

    return {jenkinsUrl: jenkinsAccess.url};
  } catch (err) {
    // const newErr = new Error(err.response.headers['x-error']);
    // newErr.stack = err.stack;
    // throw newErr;
    throw err;
  }
}

async function pullJenkinsAccessSecrets(namespace: string = 'tools'): Promise<JenkinsAccessSecret> {
  return await getSecretData<JenkinsAccessSecret>('jenkins-access', namespace);
}

async function generateJenkinsCrumbHeader(jenkinsAccess: JenkinsAccessSecret): Promise<{'Jenkins-Crumb': string}> {

  const response: superagent.Response = await superagent
    .get(`${jenkinsAccess.url}/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,":",//crumb)`)
    .auth(jenkinsAccess.username, jenkinsAccess.api_token)
    .set('User-Agent', `${jenkinsAccess.username} via ibm-garage-cloud cli`);

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Unable to generate Jenkins crumb: ${response.text}`);
  }

  return {
    'Jenkins-Crumb': response.text.replace(`${'Jenkins-Crumb'}:`, '')
  };
}

async function buildJenkinsJobConfig(gitParams: GitParams): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path.join(__dirname, '../../../etc/jenkins-config-template.xml'), (err, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(data.toString()
        .replace('{{GIT_REPO}}', gitParams.url)
        .replace('{{GIT_CREDENTIALS}}', gitParams.name)
        .replace('{{GIT_BRANCH}}', gitParams.branch));
    });
  });
}

/*
********** End: Execute Register Pipeline **********
*/

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
