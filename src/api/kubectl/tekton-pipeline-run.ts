import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeMetadata, KubeResource, Props} from './kubernetes-resource-manager';

export interface TektonPipelineRun<M = KubeMetadata> extends KubeResource<M> {
  spec: {
    pipelineRef: {
      name: string
    }
    resources?: Array<{
      name: string
      resourceRef?: {
        name: string
      }
      resourceSpec?: {
        type: string
        params: Array<{
          name: string
          value: string
        }>
      }
    }>
    params?: Array<{
      name: string,
      value: string
    }>
    serviceAccountName?: string;
    timeout?: string;
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeTektonPipelineRun({
    client: context.resolve(AsyncKubeClient),
    group: 'tekton.dev',
    version: 'v1alpha1',
    name: 'pipelineruns',
    kind: 'PipelineRun',
    crd: true,
  });
};

@Factory(factory)
export class KubeTektonPipelineRun extends AbstractKubernetesResourceManager<TektonPipelineRun> {
  constructor(props: Props) {
    super(props);
  }
}
