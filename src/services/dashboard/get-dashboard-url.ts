import {Inject} from 'typescript-ioc';
import {GetDashboardUrl} from './get-dashboard-url.api';
import {KubeConfigMap, KubeIngress} from '../../api/kubectl';

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