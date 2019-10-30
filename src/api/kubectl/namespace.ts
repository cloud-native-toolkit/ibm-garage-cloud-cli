import {KubeClient} from './client';
import {KubeBody, KubeResource} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';

export interface Namespace extends KubeResource {
}

const provider: Provider = {
  get: () => {
    return new KubeNamespace({
      client: Container.get(KubeClient)
    })
  }
};

@Provided(provider)
export class KubeNamespace {
  public client: KubeClient;

  constructor(props: {client: KubeClient}) {
    this.client = props.client;
  }

  async create(name: string): Promise<Namespace> {
    const result: KubeBody<Namespace> = await this.client.api.v1.namespace.post({body: {
      metadata: {
        name,
      },
    }} as KubeBody<Namespace>);

    return result.body;
  }

  async exists(name: string): Promise<boolean> {
    try {
      const result = await this.client.api.v1.namespace(name).get();

      if (result) {
        return true;
      }
    } catch (err) {}

    return false;
  }
}
