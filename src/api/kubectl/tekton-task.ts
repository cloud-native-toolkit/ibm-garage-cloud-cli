import {Container, Provided, Provider} from 'typescript-ioc';

import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeKindBuilder} from './kind-builder';

export interface TektonTask extends KubeResource {
  spec: {
    inputs?: {
      params: Array<{
        default: string;
        name: string;
        type: string;
      }>;
      resources: Array<{
        name: string;
        type: string;
      }>;
    };
    stepTemplate: object;
    steps: Array<object>;
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonTask({
      client: Container.get(KubeKindBuilder),
      group: 'tekton.dev',
      version: 'v1alpha1',
      name: 'tasks',
      kind: 'Task',
      crd: true,
    });
  }
};

@Provided(provider)
export class KubeTektonTask extends AbstractKubernetesResourceManager<TektonTask> {
  constructor(props: Props) {
    super(props);
  }
}
