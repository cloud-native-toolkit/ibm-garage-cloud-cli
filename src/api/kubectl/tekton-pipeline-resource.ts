import {Container, Provided, Provider} from 'typescript-ioc';

import {KubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface TektonPipelineResource extends KubeResource {
  spec: {
    type: string;
    params: Array<{
      name: string;
      value: string;
    }>;
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonPipelineResource({
      client: Container.get(KubeClient),
      group: 'tekton.dev',
      version: 'v1alpha1',
      name: 'pipelineresources',
      kind: 'PipelineResource',
      crd: true,
    });
  }
};

@Provided(provider)
export class KubeTektonPipelineResource extends AbstractKubernetesResourceManager<TektonPipelineResource> {
  constructor(props: Props) {
    super(props);
  }
}
