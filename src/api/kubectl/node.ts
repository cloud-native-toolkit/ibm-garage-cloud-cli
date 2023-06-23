import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {
  AbstractKubernetesClusterResource,
  AbstractKubernetesNamespacedResource,
  KubeResource,
  Props
} from './kubernetes-resource-manager';

export interface NodeInfo {
  architecture: string
  containerRuntimeVersion: string
  kubeletVersion: string
  machineID: string
  operatingSystem: string
  osImage: string
  systemUUID: string
}

export interface NodeAddress {
  address: string
  type: string
}

export interface Node extends KubeResource {
  spec: {
    providerID: string
  }
  status: {
    addresses: NodeAddress[]
    nodeInfo: NodeInfo
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeNode({
    client: context.resolve(AsyncKubeClient),
    group: '',
    version: 'v1',
    name: 'nodes',
    kind: 'Node',
  });
};

@Factory(factory)
export class KubeNode extends AbstractKubernetesClusterResource<Node> {
  constructor(props: Props) {
    super(props);
  }
}
