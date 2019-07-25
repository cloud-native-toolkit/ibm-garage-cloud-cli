import {Client1_13 as Client} from 'kubernetes-client';
import * as KubeClient from './client';
import _ from 'lodash';

// required for rewire to work
let buildKubeClient = KubeClient.buildKubeClient;

interface Ingress {
  body: {
    apiVersion: string;
    kind: 'Ingress';
    metadata: {
      name: string;
      namespace: string;
      labels: any;
    };
    spec: {
      rules?: Array<{
        host: string;
        http: {
          paths: Array<{
            backend: {
              serviceName: string;
              servicePort: number;
            }
          }>
        }
      }>
    };
    status: any;
  }
}

export async function getIngressHosts(namespace: string, ingressName: string): Promise<string[]> {
  const client = buildKubeClient();

  const ingress: Ingress = await client.apis.extension.v1beta1.namespace(namespace).ingress(ingressName).get();

  const hosts: string[] = (ingress.body.spec.rules || [])
    .map(rule => rule.host)
    .filter(host => !!host);

  if (hosts.length === 0) {
    throw new Error('no hosts found');
  }

  return hosts;
}

export async function getAllIngressHosts(namespace: string): Promise<string[]> {
  const client = buildKubeClient();

  const ingresses = await client.apis.extension.v1beta1.namespace(namespace).ingress.get();

  // Update
  let _rules = [];
  ingresses.body.items.forEach(item => {
    _rules = _rules.concat(item.spec.rules);
  });

  const hosts =  _rules.map(rule => rule.host).filter(host => !!host);

  if (hosts.length === 0) {
    throw new Error('no hosts found');
  }

  return hosts;
}

