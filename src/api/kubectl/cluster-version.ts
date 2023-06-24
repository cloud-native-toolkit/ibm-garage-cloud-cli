import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesNamespacedResource, KubeResource, Props} from './kubernetes-resource-manager';

export interface ClusterVersionDesired {
  image: string
  url: string
  version: string
}

export interface ClusterVersion extends KubeResource {
  spec: {
    clusterID: string
  }
  status: {
    desired: ClusterVersionDesired
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeClusterVersion({
    client: context.resolve(AsyncKubeClient),
    group: 'config.openshift.io',
    version: 'v1',
    name: 'clusterversions',
    kind: 'ClusterVersion',
    crd: true,
  });
};

@Factory(factory)
export class KubeClusterVersion extends AbstractKubernetesNamespacedResource<ClusterVersion> {
  constructor(props: Props) {
    super(props);
  }
}
