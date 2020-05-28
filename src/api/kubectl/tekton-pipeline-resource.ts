import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
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

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeTektonPipelineResource({
    client: context.resolve(AsyncKubeClient),
    group: 'tekton.dev',
    version: 'v1alpha1',
    name: 'pipelineresources',
    kind: 'PipelineResource',
    crd: true,
  });
};

@Factory(factory)
export class KubeTektonPipelineResource extends AbstractKubernetesResourceManager<TektonPipelineResource> {
  constructor(props: Props) {
    super(props);
  }
}
