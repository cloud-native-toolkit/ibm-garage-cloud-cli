import {Container, Provided, Provider} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeClient} from './client';

export interface ServiceAccount extends KubeResource {
  imagePullSecrets?: Array<{name: string}>;
  secrets?: Array<{name: string}>;
}

const provider: Provider = {
  get: () => {
    return new KubeServiceAccount({
      client: Container.get(KubeClient),
      name: 'serviceaccounts',
      kind: 'ServiceAccount',
    });
  }
};

@Provided(provider)
export class KubeServiceAccount extends AbstractKubernetesResourceManager<ServiceAccount> {
  constructor(props: Props) {
    super(props);
  }
}