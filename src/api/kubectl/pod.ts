import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {AsyncKubeClient} from './client';

export interface Pod extends KubeResource{
  spec: any;
}

const provider: Provider = {
  get: () => {
    return new KubePod({
      client: Container.get(AsyncKubeClient),
      name: 'pod',
      kind: 'Pod',
    });
  }
};

@Provided(provider)
export class KubePod extends AbstractKubernetesResourceManager<Pod> {
  constructor(props: Props) {
    super(props);
  }
}
