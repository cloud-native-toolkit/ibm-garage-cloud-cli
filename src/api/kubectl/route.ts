import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import * as _ from 'lodash';

import {AsyncOcpClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface Route extends KubeResource {
  spec: {
    host?: string;
    port: {
      targetPort: string;
    }
    tls?: {
      termination?: string;
      insecureEdgeTerminationPolicy?: 'Allow' | 'None' | 'Redirect'
    }
    to: {
      kind: string;
      name: string;
      weight: number;
    }
    wildcardPolicy?: string;
  };
  status?: any;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new OcpRoute({
    client: context.resolve(AsyncOcpClient) as any,
    group: 'route.openshift.io',
    version: 'v1',
    name: 'route',
    kind: 'Route',
  });
};

@Factory(factory)
export class OcpRoute extends AbstractKubernetesResourceManager<Route> {
  constructor(props: Props) {
    super(props);
  }

  async getAllUrls(namespace: string): Promise<Array<{ name: string, urls: string[] }>> {
    const routes: Route[] = await this.list({ namespace });

    const values: Array<{ name: string, urls: string[] }> = routes.map(ingress => this.mapRoute(ingress));

    return values;
  }

  async getUrls(namespace: string, ingressName: string): Promise<string[]> {
    const ingress: Route = await this.get(ingressName, namespace);

    const { urls } = this.mapRoute(ingress);

    if (urls.length === 0) {
      throw new Error('no hosts found');
    }

    return urls;
  }

  mapRoute(route: Route): { name: string, urls: string[], hosts: string[] } {

    const host: string = route.spec.host;
    const protocol: string = !!route.spec.tls ? 'https' : 'http';

    const url: string = `${protocol}://${host}`;

    return {
      name: this.getNameFromLabels(route),
      urls: [url],
      hosts: [host],
    };
  }

  getNameFromLabels(ingress: Route): string {
    const labels = [
      _.get(ingress, ['metadata', 'labels', 'app.kubernetes.io/name']),
      _.get(ingress, ['metadata', 'labels', 'app']),
      _.get(ingress, ['metadata', 'name']),
    ];

    return labels.filter(value => !!value)[0];
  }

  async getHosts(namespace: string, ingressName: string): Promise<string[]> {
    const route: Route = await this.get(ingressName, namespace);

    const { hosts } = this.mapRoute(route);

    return hosts;
  }

  async getAllHosts(namespace: string): Promise<string[]> {
    const routes: Route[] = await this.list({ namespace });

    const hosts: string[] = _.flatMap(
      routes
        .map(route => this.mapRoute(route))
        .map(({ hosts }) => hosts)
    );

    return hosts;
  }
}
