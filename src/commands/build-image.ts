import * as path from 'path';
import {execFile} from 'child_process';

import {BUILD_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../util/env-support';
import {BuildOptions} from '../model';

export async function buildImage(argv: BuildOptions): Promise<{ stdout: string, stderr: string }> {
  return execFile.__promisify__(
    path.join(__dirname, '../../bin/build-image.sh'),
    [argv.imageName, argv.imageVersion],
    {
      env: extractEnvironmentProperties(BUILD_OPTION_ENV_PROPERTIES, argv)
    },
  );
}
