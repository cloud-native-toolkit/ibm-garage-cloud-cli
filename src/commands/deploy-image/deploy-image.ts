import * as path from 'path';
import {execFile} from 'child_process';

import {DeployOptions} from './deploy-options.model';
import {DEPLOY_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../../util/env-support';

export async function deployImage(argv: DeployOptions): Promise<{ stdout: string, stderr: string }> {
  return execFile.__promisify__(
    path.join(__dirname, '../../../bin/deploy-image.sh'),
    [argv.clusterNamespace, argv.imageName, argv.imageVersion],
    {
      env: extractEnvironmentProperties(DEPLOY_OPTION_ENV_PROPERTIES, argv)
    },
  );
}
