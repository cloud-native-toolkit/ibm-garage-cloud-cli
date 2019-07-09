import {Client1_13 as Client} from 'kubernetes-client';

import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {generateToken as generateTokenFn, GenerateTokenOptions, isAvailable as isGenTokenAvailable} from '../generate-token';
import * as secrets from '../../api/kubectl/secrets';
import * as ingress from '../../api/kubectl/ingress';
import * as kubeClient from '../../api/kubectl/client';

// Unfortunately this is required to allow rewire to replace the values
let generateToken = generateTokenFn;
let getSecretData = secrets.getSecretData;
let getIngressHosts = ingress.getIngressHosts;
let buildKubeClient = kubeClient.buildKubeClient;

export function isAvailable(): boolean {
  return isGenTokenAvailable();
}

interface JenkinsSecret {
  'jenkins-admin-password': string;
  'jenkins-admin-user': string;
}

interface GenerateAuthSecret {
  host: string;
  url: string;
  username: string;
  password: string;
  apiToken: string;
  namespace?: string;
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function configJenkinsAuth(options: JenkinsAuthOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {
  if (options.debug) {
    console.log('options: ', options);
  }

  const {username, password} = await retrieveJenkinsCredentials(options, notifyStatus);

  const {host, url} = await retrieveJenkinsUrl(options, notifyStatus);

  const apiToken = await retrieveJenkinsApiToken(
    {url, username, password},
    notifyStatus,
  );

  return generateJenkinsAuthSecret(
    {host, url, username, password, apiToken},
    notifyStatus,
  );
}

async function retrieveJenkinsCredentials({username, password, namespace = 'tools'}: {username?: string; password?: string; namespace?: string} = {}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<{username: string; password: string}> {

  if (username && password) {
    return {username, password};
  }

  notifyStatus(`Retrieving Jenkins admin password`);

  const jenkinsSecret: JenkinsSecret = await getSecretData('jenkins', namespace);

  return {
    username: jenkinsSecret['jenkins-admin-user'],
    password: jenkinsSecret['jenkins-admin-password']
  };
}

async function retrieveJenkinsUrl({url, host, namespace = 'tools'}: {url?: string, host?: string, namespace?: string} = {}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<{host: string; url: string}> {
  notifyStatus(`Retrieving Jenkins url`);

  if (!host) {
    host = (await getIngressHosts(namespace, 'jenkins'))[0];
  }

  return {host, url: url || `http://${host}`};
}

async function retrieveJenkinsApiToken(options: GenerateTokenOptions & {jenkinsApiToken?: string}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {

  notifyStatus(`Generating Jenkins api token: ${options.url}`);

  return options.jenkinsApiToken || await generateToken(options, notifyStatus);
}

export async function generateJenkinsAuthSecret({host, url, username, password, apiToken, namespace = 'tools'}: GenerateAuthSecret, notifyStatus: (status: string) => void = noopNotifyStatus) {

  notifyStatus(`Generating jenkins-access secret using apiToken: ${apiToken}`);

  const client = buildKubeClient();

  const result = await client.api.v1.namespaces(namespace).secrets.post({
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
        api_token: apiToken,
        url,
        host,
      },
    }
  });

  return result.body;
}
