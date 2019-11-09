import {Inject, Provides} from 'typescript-ioc';
import {KubeIngress} from '../../api/kubectl/ingress';

const noopNotifyStatus: (status: string) => void = () => {};

export abstract class GetIngress {
  async abstract getIngress(namespace?: string, notifyStatus?: (status: string) => void): Promise<Array<{name: string, url: string}>>;
}

@Provides(GetIngress)
export class GetIngressImpl implements GetIngress {
  @Inject
  private kubeIngress: KubeIngress;

  async getIngress(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Array<{name: string, url: string}>> {

    notifyStatus('Getting hosts for namespace ' + namespace);

    try {
      const values: Array<{name: string, urls: string[]}> = await this.kubeIngress.getAllUrls(namespace);

      return values
        .filter(value => value.urls.length > 0)
        .map(value => ({name: value.name, url: value.urls[0]}));
    } catch (err) {
      return [];
    }
  }
}

