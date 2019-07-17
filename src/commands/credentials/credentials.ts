import * as secrets from '../../api/kubectl/secrets';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';
import * as kubeClient from '../../api/kubectl/client';
import * as ingress from '../../api/kubectl/ingress';

let getSecretData = secrets.getSecretData;
let getIngressHosts = ingress.getIngressHosts;
let buildKubeClient = kubeClient.buildKubeClient;

export interface ComponentCredentials {
  username?: string;
  password?: string;
}

export interface ComponentUrl {
  url?: string;
}

export interface ComponentInfo extends ComponentCredentials, ComponentUrl {
}

export interface Secrets {
  jenkins: JenkinsAccessSecret | {};
  argocd: ComponentInfo;
  sonarqube: ComponentInfo;
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function getCredentials(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Secrets> {
  notifyStatus('Getting Jenkins credentials');

  const jenkins = await getJenkinsInfo(namespace);

  notifyStatus('Getting argocd credentials');

  const argocd = await getArgoCdInfo(namespace);

  notifyStatus('Getting sonarqube credentials');

  const sonarqube = await getSonarqubeInfo(namespace);

  return {
    jenkins,
    argocd,
    sonarqube,
  };
}

async function getJenkinsInfo(namespace: string = 'tools'): Promise<JenkinsAccessSecret | {}> {
  try {
    return await getSecretData('jenkins-access', namespace);
  } catch (err) {
    return {};
  }
}

async function getSonarqubeInfo(namespace: string = 'tools'): Promise<ComponentInfo> {
  return Object.assign(
    {},
    await getSonarqubeCredentials(namespace),
    await getSonarqubeUrl(namespace),
  );
}

async function getSonarqubeCredentials(namespace: string = 'tools'): Promise<ComponentCredentials> {
  try {
    return await getSecretData('sonarqube-access', namespace);
  } catch (err) {
    return {};
  }
}

async function getSonarqubeUrl(namespace: string = 'tools'): Promise<ComponentUrl> {
  try {
    const host = (await getIngressHosts(namespace, 'sonarqube-sonarqube'))[0];

    return {url: `http://${host}`};
  } catch (err) {
    return {};
  }
}

async function getArgoCdInfo(namespace: string = 'tools'): Promise<ComponentInfo> {
  return Object.assign(
    {},
    await getArgoCdCredentials(namespace),
    await getArgoCdUrl(namespace),
  );
}

async function getArgoCdCredentials(namespace: string = 'tools'): Promise<ComponentCredentials> {
  const client = buildKubeClient();

  try {
    const result = await client.api.v1.namespace(namespace).pods.get();

    const password = result.body.items
      .map(item => item.metadata.name)
      .filter(name => name.startsWith('argocd-server'))[0];

    return {username: 'admin', password};
  } catch (err) {
    return {};
  }
}

async function getArgoCdUrl(namespace: string = 'tools'): Promise<ComponentUrl> {
  try {
    const host = (await getIngressHosts(namespace, 'argocd-server-http'))[0];

    return {url: `http://${host}`};
  } catch (err) {
    return {};
  }
}
