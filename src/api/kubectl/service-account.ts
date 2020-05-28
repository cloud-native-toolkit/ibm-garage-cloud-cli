import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {AsyncKubeClient} from './client';

export interface ServiceAccount extends KubeResource {
  imagePullSecrets?: Array<{name: string}>;
  secrets?: Array<{name: string}>;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeServiceAccount({
    client: context.resolve(AsyncKubeClient),
    name: 'serviceaccounts',
    kind: 'ServiceAccount',
  });
};

@Factory(factory)
export class KubeServiceAccount extends AbstractKubernetesResourceManager<ServiceAccount> {
  constructor(props: Props) {
    super(props);
  }
}
