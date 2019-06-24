import {execFile} from 'child_process';
import * as path from "path";

import {JENKINS_AUTH_ENV_PROPERTIES, JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {generateToken, isAvailable as isGenTokenAvailable} from '../generate-token';
import {BUILD_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../../util/env-support';


export function isAvailable(): boolean {
    return isGenTokenAvailable();
}

export async function configJenkinsAuth(options: JenkinsAuthOptions) {
    const apiToken = await generateToken(Object.assign(
      {},
      options,
      {url: `http://${options.host}`}));

    return new Promise((resolve, reject) => {
        const child = execFile(
          path.join(__dirname, '../../../bin/config-jenkins-auth.sh'),
          [apiToken],
          {
              env: Object.assign(
                {},
                process.env,
                extractEnvironmentProperties(JENKINS_AUTH_ENV_PROPERTIES, options),
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
