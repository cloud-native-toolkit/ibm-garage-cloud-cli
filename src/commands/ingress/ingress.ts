import * as secrets from '../../api/kubectl/secrets';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';
import * as kubeClient from '../../api/kubectl/client';
import * as ingress from '../../api/kubectl/ingress';

let getSecretData = secrets.getSecretData;
let getIngressHosts = ingress.getIngressHosts;
let getAllIngressHosts = ingress.getAllIngressHosts;
let buildKubeClient = kubeClient.buildKubeClient;

const noopNotifyStatus: (status: string) => void = () => {};

export async function getIngress(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<String[]> {

  notifyStatus('Getting Hosts for Namespace '+namespace);
  const hosts = await getHostsFromIngress(namespace);
  return hosts;

}

async function getHostsFromIngress(namespace: string = 'dev'): Promise<String[]> {
  try {

    const hosts = (await getAllIngressHosts(namespace));

    return hosts;
  } catch (err) {
    return [];
  }
}
