import {AsyncKubeClient, KubeClient} from './client';
import {KubeBody, KubeResource} from './kubernetes-resource-manager';
import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

export interface Namespace extends KubeResource {
}

export abstract class AbstractKubeNamespace<T extends KubeResource> {
  abstract create(name: string): Promise<T>;
  abstract list(name: string): Promise<T[]>;
  abstract exists(name: string): Promise<boolean>;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeNamespace({
    client: context.resolve(AsyncKubeClient)
  });
};

@Factory(factory)
export class KubeNamespace implements AbstractKubeNamespace<Namespace> {
  public client: AsyncKubeClient;

  constructor(props: {client: AsyncKubeClient}) {
    this.client = props.client;
  }

  async create(name: string): Promise<Namespace> {
    const client: KubeClient = await this.client.get();
    const result: KubeBody<Namespace> = await client.api.v1.namespace.post({body: {
      metadata: {
        name,
      },
    }} as KubeBody<Namespace>);

    return result.body;
  }

  async list(): Promise<Namespace[]> {
    const client: KubeClient = await this.client.get();

    return client.api.v1.namespace.get();
  }

  async exists(name: string): Promise<boolean> {
    try {
      const client: KubeClient = await this.client.get();
      const result = await client.api.v1.namespace(name).get();

      if (result) {
        return true;
      }
    } catch (err) {}

    return false;
  }
}
