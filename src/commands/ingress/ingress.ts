import {Inject, Provides} from 'typescript-ioc';
import {KubeIngress} from '../../api/kubectl/ingress';

const noopNotifyStatus: (status: string) => void = () => {};

export abstract class GetIngress {
  async abstract getIngress(namespace?: string, notifyStatus?: (status: string) => void): Promise<String[]>;
}

@Provides(GetIngress)
export class GetIngressImpl implements GetIngress {
  @Inject
  private kubeIngress: KubeIngress;

  async getIngress(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string[]> {

    notifyStatus('Getting Hosts for Namespace '+namespace);

    try {
      return await this.kubeIngress.getAllHosts(namespace);
    } catch (err) {
      return [];
    }
  }
}

