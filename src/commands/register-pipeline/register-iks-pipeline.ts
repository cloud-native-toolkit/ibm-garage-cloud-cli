import * as path from "path";
import * as fs from 'fs';
import * as superagent from 'superagent';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {GitParams} from './create-git-secret';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';
import {getSecretData} from '../../api/kubectl/secrets';

let readFile = fs.readFile;
let post = superagent.post;
let get = superagent.get;

export function setupDefaultOptions(): Partial<RegisterPipelineOptions> {
  return {
    jenkinsNamespace: 'tools',
    pipelineNamespace: 'tools',
  };
}

export async function registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

  const jenkinsAccess = await pullJenkinsAccessSecrets(options.jenkinsNamespace);

  const jobName = gitParams.branch !== 'master'
    ? `${gitParams.name}_${gitParams.branch}`
    : gitParams.name;

  const headers = options.generateCrumb ? await generateJenkinsCrumbHeader(jenkinsAccess) : {};

  try {
    const response: superagent.Response = await
      post(`${jenkinsAccess.url}/createItem?name=${jobName}`)
        .auth(jenkinsAccess.username, jenkinsAccess.api_token)
        .set(headers)
        .set('User-Agent', `${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`)
        .set('Content-Type', 'text/xml')
        .send(await buildJenkinsJobConfig(gitParams));

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Unable to create Jenkins job: ${response.text}`);
    }

    return {jenkinsUrl: jenkinsAccess.url};
  } catch (err) {
    console.error('Error creating job', err);
    throw err;
  }
}

async function pullJenkinsAccessSecrets(namespace: string = 'tools'): Promise<JenkinsAccessSecret> {
  return await getSecretData<JenkinsAccessSecret>('jenkins-access', namespace);
}

async function generateJenkinsCrumbHeader(jenkinsAccess: JenkinsAccessSecret): Promise<{'Jenkins-Crumb': string}> {

  console.log(`${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`);

  const response: superagent.Response = await
    get(`${jenkinsAccess.url}/crumbIssuer/api/json`)
      .auth(jenkinsAccess.username, jenkinsAccess.api_token)
      .set('User-Agent', `${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`);

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Unable to generate Jenkins crumb: ${response.text}`);
  }

  const body: {crumb: string, crumbRequestField: string} = response.body;

  const result = {};
  result[body.crumbRequestField] = body.crumb;

  return result as any;
}

async function buildJenkinsJobConfig(gitParams: GitParams): Promise<string> {
  const data: Buffer = await readFilePromise(path.join(__dirname, '../../../etc/jenkins-config-template.xml'));

  return data.toString()
    .replace(new RegExp('{{GIT_REPO}}', 'g'), gitParams.url)
    .replace(new RegExp('{{GIT_CREDENTIALS}}', 'g'), gitParams.name)
    .replace(new RegExp('{{GIT_BRANCH}}', 'g'), gitParams.branch);
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
