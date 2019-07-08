import {Client1_13 as Client} from 'kubernetes-client';

import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {generateToken as generateTokenFn, GenerateTokenOptions, isAvailable as isGenTokenAvailable} from '../generate-token';
import {getSecretData as getSecretDataFn} from '../../api/kubectl/secrets';

// Unfortunately this is required to allow rewire to replace the values
let generateToken = generateTokenFn;
let getSecretData = getSecretDataFn;

export function isAvailable(): boolean {
  return isGenTokenAvailable();
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function configJenkinsAuth(options: JenkinsAuthOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {
  if (options.debug) {
    console.log('options: ', options);
  }

  const password = options.password || await retrieveJenkinsPassword(options.namespace);

  const url = options.url || `http://${options.host}`;

  const apiToken = options.jenkinsApiToken
    || await generateToken(
      Object.assign(
        {},
        options,
        {url, password},
      ),
      notifyStatus,
    );

  notifyStatus(`Generating jenkins-access secret using apiToken: ${apiToken}`);

  return generateJenkinsAuthSecret(options.host, url, options.username, password, apiToken);
}

export async function generateJenkinsAuthSecret(host: string, url: string, username: string, password: string, api_token: string) {
  const client = new Client({ version: '1.13' });

  const result = await client.api.v1.namespaces('tools').secrets.post({
    body: {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'jenkins-access',
        annotations: {
          description: 'secret providing jenkins credentials, used to interact with Jenkins apis',
        },
      },
      type: 'Opaque',
      stringData: {
        username,
        password,
        api_token,
        url,
        host,
      },
    }
  });

  return result.body;
}

interface JenkinsSecret {
  'jenkins-admin-password': string;
  'jenkins-admin-user': string;
}

async function retrieveJenkinsPassword(namespace: string = 'tools'): Promise<string> {
  const jenkinsSecret: JenkinsSecret = await getSecretData('jenkins', namespace);

  return jenkinsSecret['jenkins-admin-password'];
}
