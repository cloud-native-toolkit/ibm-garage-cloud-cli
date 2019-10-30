import {Container, Provided, Provider} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeClient} from './client';

export interface ServiceAccount extends KubeResource {
  type: string;
  imagePullSecrets?: Array<{name: string}>;
  secrets?: Array<{name: string}>;
}

const provider: Provider = {
  get: () => {
    return new KubeServiceAccount({
      client: Container.get(KubeClient),
      kind: 'serviceaccounts',
    });
  }
};

@Provided(provider)
export class KubeServiceAccount  extends AbstractKubernetesResourceManager<ServiceAccount> {
  constructor(props: Props) {
    super(props);
  }
}
