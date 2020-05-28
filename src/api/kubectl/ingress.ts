import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import * as _ from 'lodash';

import {AsyncKubeClient, KubeClient} from './client';
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

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeIngress({
    client: context.resolve(AsyncKubeClient),
    group: 'extension',
    version: 'v1beta1',
    name: 'ingress',
    kind: 'Ingress',
  });
};

@Factory(factory)
export class KubeIngress extends AbstractKubernetesResourceManager<Ingress> {
  constructor(props: Props) {
    super(props);
  }

  async getAllUrls(namespace: string): Promise<Array<{name: string, urls: string[]}>> {
    const ingresses: Ingress[] = await this.list({namespace});

    const values: Array<{name: string, urls: string[]}> = ingresses.map(ingress => this.mapIngress(ingress));

    return values;
  }

  async getUrls(namespace: string, ingressName: string): Promise<string[]> {
    const ingress: Ingress = await this.get(ingressName, namespace);

    const {urls} = this.mapIngress(ingress);

    if (urls.length === 0) {
      throw new Error('no hosts found');
    }

    return urls;
  }

  mapIngress(ingress: Ingress): {name: string, urls: string[]} {

    const httpsUrls: string[] = _.flatMap((ingress.spec.tls || [])
      .map(tls => tls.hosts.map(host => `https://${host}`)));

    const httpUrls: string[] = (ingress.spec.rules || [])
      .map(rule => rule.host)
      .filter(host => !!host)
      .map(host => `http://${host}`);

    const urls = [].concat(...httpsUrls).concat(...httpUrls);

    return {
      name: this.getNameFromLabels(ingress),
      urls
    };
  }

  getNameFromLabels(ingress: Ingress): string {
    const labels = [
      _.get(ingress, ['metadata', 'labels', 'app.kubernetes.io/name']),
      _.get(ingress, ['metadata', 'labels', 'app']),
      _.get(ingress, ['metadata', 'name']),
    ];

    return labels.filter(value => !!value)[0];
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
