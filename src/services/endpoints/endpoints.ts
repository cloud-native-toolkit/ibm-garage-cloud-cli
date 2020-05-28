import {Inject} from 'typescript-ioc';
import {GetEndpoints} from './endpoints.api';
import {KubeIngress, OcpRoute} from '../../api/kubectl';

const noopNotifyStatus: (status: string) => void = () => {};

export class GetEndpointsImpl implements GetEndpoints {
  @Inject
  private kubeIngress: KubeIngress;
  @Inject
  private ocpRoute: OcpRoute;

  async getEndpoints(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Array<{name: string, url: string}>> {

    const ingresses: Array<{name: string, url: string}> = await this.getIngresses(namespace, notifyStatus);
    const routes: Array<{name: string, url: string}> = await this.getRoutes(namespace, notifyStatus);

    return ingresses.concat(routes);
  }

  async getIngresses(namespace: string = 'tools', notifyStatus: (status: string) => void): Promise<Array<{name: string, url: string}>> {

    notifyStatus('Getting ingresses for namespace ' + namespace);

    try {
      const values: Array<{name: string, urls: string[]}> = await this.kubeIngress.getAllUrls(namespace);

      return this.mapUrlValues(values, 'ingress');
    } catch (err) {
      return [];
    }
  }

  async getRoutes(namespace: string = 'tools', notifyStatus: (status: string) => void): Promise<Array<{name: string, url: string, source: string}>> {

    notifyStatus('Getting routes for namespace ' + namespace);

    try {
      const values: Array<{name: string, urls: string[]}> = await this.ocpRoute.getAllUrls(namespace);

      return this.mapUrlValues(values, 'route');
    } catch (err) {
      return [];
    }
  }

  mapUrlValues(values: Array<{name: string, urls: string[]}>, source: string): Array<{name: string, url: string, source: string}> {
    return values
      .filter(value => value.urls.length > 0)
      .map(value => ({name: value.name, url: value.urls[0], source}));
  }
}

