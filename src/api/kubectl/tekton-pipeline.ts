import {Container, Provided, Provider} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeKindBuilder} from './kind-builder';

export interface TektonPipeline extends KubeResource {
  spec: {
    resources?: Array<{
      name: string;
      type: string;
    }>;
    tasks: Array<object>;
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonPipeline({
      client: Container.get(KubeKindBuilder),
      group: 'tekton.dev',
      version: 'v1alpha1',
      name: 'pipelines',
      kind: 'Pipeline',
      crd: true,
    });
  }
};

@Provided(provider)
export class KubeTektonPipeline extends AbstractKubernetesResourceManager<TektonPipeline> {
  constructor(props: Props) {
    super(props);
  }
}
