import path = require('path');
import child_process = require('child_process');
import {RegisterPipelineOptions} from './register-pipeline-options.model';

import {GitParams} from './create-git-secret';
import * as fileUtil from '../../util/file-util';

let writeFile = fileUtil.writeFile;
let deleteFile = fileUtil.deleteFile;
let spawn = child_process.spawn;

export async function registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

  try {
    const buildConfig = generateBuildConfig(gitParams.name, gitParams.url, gitParams.branch);

    const fileName = path.join(process.cwd(), './buildConfig.json');
    await writeFile(fileName, JSON.stringify(buildConfig));

    await spawnPromise(
      'oc',
      ['project', options.namespace || 'tools'],
      {
        env: process.env
      });

    await spawnPromise(
      'oc',
      ['create', '-f', fileName],
      {
        env: process.env
      });

    // MJP Keep file for debugging and possible redployment  
    //await deleteFile(fileName);

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

async function spawnPromise(command: string, args: string[], env: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const childProcess = spawn(command, args, env);

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
    process.stdin.pipe(childProcess.stdin);

    let result: string = '';
    childProcess.stdout.on('data', (data: string) => {
      result += data;
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(result);
        return;
      }

      reject();
    });
  });
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
