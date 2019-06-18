import * as path from 'path';
import * as fs from 'fs';
import {execFile} from 'child_process';
import * as YAML from 'yaml';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {checkKubeconfig} from '../../util/kubernetes';
import createWebhook from '../create-webhook/create-webhook';

class GitParams {
  name: string;
  url: string;
  username: string;
  password: string;
}

export async function registerPipeline(options: RegisterPipelineOptions, notifyStatus: (status: string) => void = () => {
}) {

  await checkKubeconfig();

  const valuesFile = path.join(process.cwd(), '.tmp/register-pipeline-values.yaml');

  await generateGitValues(valuesFile);

  notifyStatus('Registering pipeline');

  const pipelineResult = await executeRegisterPipeline(options.namespace, valuesFile);

  if (!options.skipWebhook) {
    notifyStatus('Creating git webhook');
    await createWebhook(await buildWebhookParams(valuesFile, pipelineResult));
  }

  await deleteFile(valuesFile);
}

async function generateGitValues(valuesFile: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/generate-git-values.sh'),
      [valuesFile],
      {
        cwd: process.cwd()
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        process.stdin.removeAllListeners();
        child.stdin.end();

        resolve();
      }
    );

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    process.stdin.pipe(child.stdin);
  });
}

async function executeRegisterPipeline(namespace: string, valuesFile: string): Promise<{jenkinsUrl: string}> {

  const releaseName = process.cwd().replace(/.*\/(.*)/, '$1');

  return new Promise<{jenkinsUrl: string}>((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/register-pipeline.sh'),
      [namespace, releaseName, valuesFile],
      {
        cwd: process.cwd(),
        env: Object.assign(
          {},
          process.env,
          {
            CLUSTER_NAMESPACE: namespace
          },
        ),
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        resolve(extractJenkinsUrl(stdout.toString()));
      },
    );
  });
}

function extractJenkinsUrl(data: string): {jenkinsUrl: string} {
  const jenkinsUrl = data
    .replace(new RegExp('\n', 'g'), ' ')
    .replace(new RegExp('.*JENKINS_URL='), '')
    .trim();

  return {jenkinsUrl};
}

async function buildWebhookParams(valuesFile: string, pipelineResult: {jenkinsUrl: string}) {

  const webhookParams = await extractWebhookParams(valuesFile);

  const params = Object.assign({}, webhookParams, pipelineResult);

  return params;
}

async function extractWebhookParams(valuesFile: string): Promise<{gitUrl: string; gitUsername: string; gitToken: string;}> {
  return new Promise((resolve, reject) => {
    fs.readFile(valuesFile, (err, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      const yamlValues = YAML.parse(data.toString());
      if (!yamlValues) {
        reject(new Error('file cannot be parsed'));
        return;
      }

      const gitValues: GitParams = yamlValues.git;

      if (!gitValues) {
        reject(new Error('webhook contents not found'));
        return;
      }

      resolve({
        gitUrl: gitValues.url,
        gitUsername: gitValues.username,
        gitToken: gitValues.password
      })
    });
  });
}

async function deleteFile(filename: string) {
  return new Promise((resolve, reject) => {
    fs.unlink(filename, (err => {
      if (err) {
        reject(err);
      }

      resolve();
    }));
  });
}
