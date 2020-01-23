import {Inject, Provides, Singleton} from 'typescript-ioc';
import {KubeIngress} from '../../api/kubectl/ingress';
import {KubeConfigMap} from '../../api/kubectl';

export abstract class GetDashboardUrl {
  async abstract getUrl(namespace: string): Promise<string>;
}

@Provides(GetDashboardUrl)
export class GetDashboardUrlImpl implements GetDashboardUrl {
  @Inject
  kubeIngress: KubeIngress;
  @Inject
  kubeConfigMap: KubeConfigMap;

  async getUrl(namespace: string): Promise<string> {
    try {
      const config: {DASHBOARD_URL: string} = await this.kubeConfigMap.getData('dashboard-config', namespace);

      return config.DASHBOARD_URL;
    } catch (err) {}

    return this.kubeIngress.getUrls(namespace, 'catalyst-dashboard').then(urls => urls[0]);
  }

}