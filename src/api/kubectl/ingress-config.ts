import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {
  AbstractKubernetesClusterResource,
  AbstractKubernetesNamespacedResource,
  KubeResource,
  Props
} from './kubernetes-resource-manager';

export interface IngressConfig extends KubeResource {
  spec: {
    domain: string
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeIngressConfig({
    client: context.resolve(AsyncKubeClient),
    group: 'config.openshift.io',
    version: 'v1',
    name: 'ingresses',
    kind: 'Ingress',
    crd: true,
  });
};

@Factory(factory)
export class KubeIngressConfig extends AbstractKubernetesClusterResource<IngressConfig> {
  constructor(props: Props) {
    super(props);
  }
}
