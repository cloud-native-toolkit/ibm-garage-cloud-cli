import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesNamespacedResource, KubeResource, Props} from './kubernetes-resource-manager';

export interface TektonPipelineParam {
  type?: 'string' | 'array';
  name: string;
  description?: string;
  default?: string;
}

export interface TektonPipeline extends KubeResource {
  spec: {
    params?: Array<TektonPipelineParam>;
    resources?: Array<{
      name: string;
      type: string;
    }>;
    tasks: Array<object>;
  };
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeTektonPipeline({
    client: context.resolve(AsyncKubeClient),
    group: 'tekton.dev',
    version: 'v1alpha1',
    name: 'pipelines',
    kind: 'Pipeline',
    crd: true,
  });
};

@Factory(factory)
export class KubeTektonPipeline extends AbstractKubernetesNamespacedResource<TektonPipeline> {
  constructor(props: Props) {
    super(props);
  }
}
