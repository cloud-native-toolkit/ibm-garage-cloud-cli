import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

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

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeTektonTask({
    client: context.resolve(AsyncKubeClient),
    group: 'tekton.dev',
    version: 'v1alpha1',
    name: 'tasks',
    kind: 'Task',
    crd: true,
  });
};

@Factory(factory)
export class KubeTektonTask extends AbstractKubernetesResourceManager<TektonTask> {
  constructor(props: Props) {
    super(props);
  }
}
