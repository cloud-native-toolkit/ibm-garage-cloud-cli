import {Container, Provided, Provider} from 'typescript-ioc';

import {KubeKindBuilder} from './kind-builder';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface ServiceAccount extends KubeResource {
  imagePullSecrets?: Array<{name: string}>;
  secrets?: Array<{name: string}>;
}

const provider: Provider = {
  get: () => {
    return new KubeServiceAccount({
      client: Container.get(KubeKindBuilder),
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
