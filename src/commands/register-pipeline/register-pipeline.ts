import * as path from 'path';
import * as fs from 'fs';
import {execFile} from 'child_process';
import * as readline from 'readline';
import * as opn from 'opn';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {deployImage, DeployOptions} from '../deploy-image';

export async function registerPipeline(options: RegisterPipelineOptions) {

  await checkKubeconfig();

  const valuesFile = path.join(process.cwd(), '.tmp/register-pipeline-values.yaml');
  const releaseName = process.cwd().replace(/.*\/(.*)/, '$1');

  await new Promise((resolve, reject) => {
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

        resolve({stdout, stderr});
      }
    );

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    process.stdin.pipe(child.stdin);
  });

  await new Promise((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/register-pipeline.sh'),
      [options.namespace, releaseName, valuesFile],
      {
        cwd: process.cwd(),
        env: Object.assign(
          {},
          process.env,
          {
            CLUSTER_NAMESPACE: options.namespace
          },
        ),
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        resolve({stdout, stderr});
      },
    );

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });

  await fs.promises.unlink(valuesFile);
}

async function checkKubeconfig() {
  return new Promise((resolve, reject) => {
    if (!process.env.KUBECONFIG) {
      console.log('KUBECONFIG environment variable not found. It appears the kubernetes environment has not been initialized.');
      console.log('To initialize the kubernetes:');
      console.log(' 1) Navigate to https://cloud.ibm.com/kubernetes/clusters');
      console.log(' 2) Select the kubernetes cluster');
      console.log(' 3) Follow the instructions on the access tab');
      console.log('');
      process.stdout.write('Open the URL in the default browser? [Y/n]> ');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      rl.on('line', function (line) {
        if (line === 'n') {
          reject(new Error('KUBECONFIG not set'));
        }

        opn('https://cloud.ibm.com/kubernetes/clusters');
        reject(new Error('KUBECONFIG not set'));
      });
    } else {
      resolve();
    }
  });
}
