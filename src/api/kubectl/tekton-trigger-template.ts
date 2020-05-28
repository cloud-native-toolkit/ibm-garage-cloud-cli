import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {
  AbstractKubernetesResourceManager,
  KubeResource,
  Props,
  TemplateKubeMetadata
} from './kubernetes-resource-manager';
import {TektonPipelineRun} from './tekton-pipeline-run';

export interface TriggerTemplate<T extends KubeResource<TemplateKubeMetadata> = any> extends KubeResource {
  spec: {
    params: Array<{
      name: string
      description?: string
    }>
    resourcetemplates: Array<T>
  };
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeTektonTriggerTemplate({
    client: context.resolve(AsyncKubeClient),
    group: 'triggers.tekton.dev',
    version: 'v1alpha1',
    name: 'triggertemplates',
    kind: 'TriggerTemplate',
    crd: true,
  });
};

@Factory(factory)
export class KubeTektonTriggerTemplate extends AbstractKubernetesResourceManager<TriggerTemplate> {
  constructor(props: Props) {
    super(props);
  }
}
