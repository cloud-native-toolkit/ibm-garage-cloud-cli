import {Container, Provided, Provider} from 'typescript-ioc';
import * as _ from 'lodash';

import {KubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface Ingress extends KubeResource {
  spec: {
    tls?: Array<{
      hosts: Array<string>;
      secretName: string;
    }>,
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

const provider: Provider = {
  get: () => {
    return new KubeIngress({
      client: Container.get(KubeClient),
      group: 'extension',
      version: 'v1beta1',
      kind: 'ingress',
    });
  }
};

@Provided(provider)
export class KubeIngress extends AbstractKubernetesResourceManager<Ingress> {
  constructor(props: Props) {
    super(props);
  }

  async getUrls(namespace: string, ingressName: string): Promise<string[]> {
    const ingress: Ingress = await this.get(ingressName, namespace);

    const httpsUrls: string[] = _.flatMap((ingress.spec.tls || [])
      .map(tls => tls.hosts.map(host => `https://${host}`)));

    const httpUrls: string[] = (ingress.spec.rules || [])
      .map(rule => rule.host)
      .filter(host => !!host)
      .map(host => `http://${host}`);

    const urls = [].concat(...httpsUrls).concat(...httpUrls);

    if (urls.length === 0) {
      throw new Error('no hosts found');
    }

    return urls;
  }

  async getHosts(namespace: string, ingressName: string): Promise<string[]> {
    const ingress: Ingress = await this.get(ingressName, namespace);

    const hosts: string[] = (ingress.spec.rules || [])
      .map(rule => rule.host)
      .filter(host => !!host);

    if (hosts.length === 0) {
      throw new Error('no hosts found');
    }

    return hosts;
  }

  async getAllHosts(namespace: string): Promise<string[]> {
    const ingresses: Ingress[] = await this.list({namespace});

    // Update
    let _rules = [];
    ingresses.forEach(item => {
      _rules = _rules.concat(item.spec.rules);
    });

    const hosts =  _rules.map(rule => rule.host).filter(host => !!host);

    if (hosts.length === 0) {
      throw new Error('no hosts found');
    }

    return hosts;
  }
}
