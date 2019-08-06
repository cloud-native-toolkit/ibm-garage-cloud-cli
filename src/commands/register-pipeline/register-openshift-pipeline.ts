import path = require('path');
import * as inquirer from 'inquirer';

import {RegisterPipelineOptions} from './register-pipeline-options.model';

import {GitParams} from './create-git-secret';
import * as kubectlFromFile from '../../api/kubectl/from-file';
import * as childProcess from '../../util/child-process';
import * as fileUtil from '../../util/file-util';
import * as openshift from '../../api/openshift';

// set these variables here so they can be replaced by rewire
let prompt = inquirer.prompt;
let writeFile = fileUtil.writeFile;
let spawnPromise = childProcess.spawnPromise;
let create = openshift.create;
let apply = openshift.apply;
let startBuild = openshift.startBuild;

export function setupDefaultOptions(): Partial<RegisterPipelineOptions> {
  return {
    jenkinsNamespace: 'tools',
    pipelineNamespace: 'dev',
  };
}

export async function registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

  try {
    const buildConfig = generateBuildConfig(gitParams.name, gitParams.url, gitParams.branch);

    const fileName = await writeFile(
      path.join(process.cwd(), './pipeline-build-config.json'),
      JSON.stringify(buildConfig)
    );

    await createBuildPipeline(buildConfig.metadata.name, fileName, options.pipelineNamespace);

    const host: string = await getRouteHosts(options.jenkinsNamespace || 'tools', 'jenkins');

    return {jenkinsUrl: host ? `https://${host}` : ''};
  } catch (err) {
    console.log('error registering', err);
  }
}

function generateBuildConfig(name: string, uri: string, branch: string = 'master', jenkinsFile: string = 'Jenkinsfile') {
  return {
    apiVersion: 'v1',
    kind: 'BuildConfig',
    metadata: {
      name
    },
    spec: {
      source: {
        git: {
          uri,
          ref: branch
        }
      },
      strategy: {
        jenkinsPipelineStrategy: {
          jenkinsfilePath: jenkinsFile,
          env: [{
            name: 'CLOUD_NAME',
            value: 'openshift'
          }]
        }
      }
    }
  };
}

async function createBuildPipeline(pipelineName: string, fileName: string, namespace: string = 'dev') {
  try {
    await create(fileName, namespace);
  } catch (err) {
    if (!err.message.match(/already exists/)) {
      throw err;
    }

    if (await shouldUpdateExistingBuildConfig(pipelineName)) {
      await apply(fileName, namespace);
    }
  }

  await startBuild(pipelineName, namespace);
}

interface Prompt {
  shouldUpdate: boolean;
}

async function shouldUpdateExistingBuildConfig(pipelineName: string): Promise<boolean> {

  const questions: inquirer.Questions<Prompt> = [{
    type: 'confirm',
    name: 'shouldUpdate',
    message: `The build pipeline (${pipelineName}) already exists. Do you want to update it?`,
    default: true
  }];

  const result: Prompt = await prompt(questions);

  return result.shouldUpdate;
}

async function getRouteHosts(namespace: string, name: string): Promise<string> {
  const routeText: string = await spawnPromise(
    'oc',
    ['get', 'route/jenkins', '-n', namespace, '-o', 'json'],
    {
      env: process.env
    },
    false
  );

  const route: {spec: {host: string}} = parseRouteOutput(routeText);

  return route.spec.host;
}

function parseRouteOutput(routeText: string): {spec: {host: string}} {
  const route: {spec: {host: string}} = JSON.parse(routeText.replace(new RegExp('^.*?{'), '{'));

  return route;
}
