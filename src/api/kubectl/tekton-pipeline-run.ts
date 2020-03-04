import {Container, Provided, Provider} from 'typescript-ioc';

import {KubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface TektonPipelineRun extends KubeResource {
  spec: {
    pipelineRef?: {
      name: string;
    };
    resources: Array<{
      name: string;
      resourceRef: {
        name: string;
      };
    }>
    serviceAccountName?: string;
    timeout?: string;
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonPipelineRun({
      client: Container.get(KubeClient),
      group: 'tekton.dev',
      version: 'v1alpha1',
      name: 'pipelineruns',
      kind: 'PipelineRun',
      crd: true,
    });
  }
};

@Provided(provider)
export class KubeTektonPipelineRun extends AbstractKubernetesResourceManager<TektonPipelineRun> {
  constructor(props: Props) {
    super(props);
  }
}
