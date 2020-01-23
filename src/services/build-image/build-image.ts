import * as path from 'path';
import {execFile} from 'child_process';

import {BuildOptions} from './build-options.model';
import {BUILD_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../../util/env-support';

export async function buildImage(argv: BuildOptions): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/build-image.sh'),
      [argv.imageName, argv.imageVersion],
      {
        env: Object.assign(
          {},
          process.env,
          extractEnvironmentProperties(BUILD_OPTION_ENV_PROPERTIES, argv),
        ),
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
  });
}
