import {execFile} from 'child_process';
import {BUILD_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../util/env-support';

export async function containerRegistry(argv: any): Promise<{ stdout: string, stderr: string }> {
  return await execFile.__promisify__(
    'ibmcloud',
    ['cr'],
    {
      env: extractEnvironmentProperties(BUILD_OPTION_ENV_PROPERTIES, argv),
    },
  );
}
