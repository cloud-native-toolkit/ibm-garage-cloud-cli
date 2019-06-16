import * as path from 'path';
import * as fs from 'fs';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {deployImage, DeployOptions} from '../deploy-image';
import {execFile} from 'child_process';

export async function registerPipeline(options: RegisterPipelineOptions) {

    const valuesFile = path.join(process.cwd(), '.tmp/register-pipeline-values.yaml');
    const releaseName = process.cwd().replace(/.*\/(.*)/, "$1");

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
