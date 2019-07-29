import path = require('path');
import {RegisterPipelineOptions} from './register-pipeline-options.model';

import {GitParams} from './create-git-secret';
import * as kubectlFromFile from '../../api/kubectl/from-file';
import * as childProcess from '../../util/child-process';
import * as fileUtil from '../../util/file-util';
import * as openshift from '../../api/openshift';

let writeFile = fileUtil.writeFile;
let spawnPromise = childProcess.spawnPromise;
let kubectlCreate = kubectlFromFile.create;
let kubectlApply = kubectlFromFile.apply;
let startBuild = openshift.startBuild;

export async function registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

  try {
    const buildConfig = generateBuildConfig(gitParams.name, gitParams.url, gitParams.branch);

    const fileName = await writeFile(
      path.join(process.cwd(), './pipeline-build-config.json'),
      JSON.stringify(buildConfig)
    );

    await createBuildPipeline(buildConfig.metadata.name, fileName, options.namespace);

    const host: string = await getRouteHosts(options.namespace || 'tools', 'jenkins');

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
  await kubectlCreate(fileName, namespace);

  await startBuild(pipelineName);
}

async function getRouteHosts(namespace: string, name: string): Promise<string> {
  const routeText: string = await spawnPromise(
    'oc',
    ['get', 'route/jenkins', '-o', 'json'],
    {
      env: process.env
    });

  const route: {spec: {host: string}} = parseRouteOutput(routeText);

  return route.spec.host;
}

function parseRouteOutput(routeText: string): {spec: {host: string}} {
  const route: {spec: {host: string}} = JSON.parse(routeText.replace(new RegExp('^.*?{'), '{'));

  return route;
}
