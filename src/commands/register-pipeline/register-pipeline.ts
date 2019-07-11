import * as fs from 'fs';
import * as path from 'path';

import {parse} from 'dot-properties';
import * as inquirer from 'inquirer';
import * as superagent from 'superagent';
import * as YAML from 'js-yaml';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {checkKubeconfig} from '../../util/kubernetes';
import createWebhook from '../create-webhook/create-webhook';
import {CreateWebhookOptions} from '../create-webhook';
import {createSecret, getSecretData} from '../../api/kubectl/secrets';
import {execPromise, ExecResult} from '../../util/child_process';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';
import {buildKubeClient} from '../../api/kubectl/client';

// set these variables here so they can be replaced by rewire
let prompt = inquirer.prompt;
let readFile = fs.readFile;

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

  await createGitSecret(gitParams, options.namespace, readValuesFile(options.values));

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
  'http': 'https{0,1}://(.*)/(.*)/(.*).git',
  'git@': 'git@(.*):(.*)/(.*).git'
};

function parseGitUrl(url: string): {url: string; org: string; repo: string} {
  const pattern = GIT_URL_PATTERNS[url.substring(0, 4)];

  if (!pattern) {
    throw new Error(`invalid git url: ${url}`);
  }

  const results = new RegExp(pattern, 'gi')
    .exec(url.endsWith('.git') ? url : `${url}.git`);

  if (!results || results.length < 4) {
    throw new Error(`invalid git url: ${url}`);
  }

  const host = results[1];
  const org = results[2];
  const repo = results[3];

  return {
    url: `https://${host}/${org}/${repo}.git`,
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

async function createGitSecret(gitParams: GitParams, namespace: string = 'tools', additionalParams: any = {}) {
  return createSecret(namespace, gitParams.name, buildGitSecretBody(gitParams, additionalParams));
}

function buildGitSecretBody(gitParams: GitParams, additionalParams: any) {
  return {
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
      stringData: Object.assign({}, additionalParams, gitParams),
    }
  };
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
  const data: Buffer = await readFilePromise(path.join(__dirname, '../../../etc/jenkins-config-template.xml'));

  return data.toString()
      .replace(new RegExp('{{GIT_REPO}}', 'g'), gitParams.url)
      .replace(new RegExp('{{GIT_CREDENTIALS}}', 'g'), gitParams.name)
      .replace(new RegExp('{{GIT_BRANCH}}', 'g'), gitParams.branch);
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

async function readFilePromise(filename: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    readFile(filename, (err, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(data);
    });
  });
}
