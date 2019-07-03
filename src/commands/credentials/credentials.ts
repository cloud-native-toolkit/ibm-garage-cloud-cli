import * as secrets from '../../api/kubectl/secrets';
import {buildKubeClient} from '../../api/kubectl/secrets';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';

let getSecretData = secrets.getSecretData;

export interface Secrets {
  jenkins: JenkinsAccessSecret;
  argocd: {username: string; password: string;}
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function getCredentials(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Secrets> {
  notifyStatus('Getting Jenkins credentials');

  const jenkins = await getJenkinsCredentials();

  notifyStatus('Getting argocd credentials');

  const argocd = await getArgoCdCredentials();

  return {
    jenkins,
    argocd
  };
}

export async function getJenkinsCredentials(namespace: string = 'tools'): Promise<JenkinsAccessSecret> {
  return await getSecretData('jenkins-access', namespace);
}

async function getArgoCdCredentials(namespace: string = 'tools'): Promise<{username: string; password: string}> {
  const client = buildKubeClient();

  const result = await client.api.v1.namespace(namespace).pods.get();

  const password = result.body.items
    .map(item => item.metadata.name)
    .filter(name => name.startsWith('argocd-server'))[0];

  return {username: 'admin', password};
}
