import {Container, Provided, Provider} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeKindBuilder} from './kind-builder';

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
    serviceAccount?: string;
    timeout?: string;
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonPipelineRun({
      client: Container.get(KubeKindBuilder),
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
