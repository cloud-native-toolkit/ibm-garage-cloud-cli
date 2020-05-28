import { Container, Provided, Provider } from 'typescript-ioc';

import { AsyncKubeClient, KubeClient } from './client';
import { AbstractKubernetesResourceManager, KubeResource, Props } from './kubernetes-resource-manager';

export interface TriggerTemplate extends KubeResource {
  spec: {
    params: Array<{
      name: string
      description?: string
    }>
    resourcetemplates: Array<{
      apiVersion: string
      kind: string
      metadata: {
        generateName: string
      }
      spec: {
        pipelineRef: {
          name: string
        }
        resources: Array<{
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
      }
    }>
  };
}

const provider: Provider = {
  get: () => {
    return new KubeTektonTriggerTemplate({
      client: Container.get(AsyncKubeClient),
      group: 'tekton.dev',
      version: 'v1alpha1',
      name: 'triggertemplates',
      kind: 'TriggerTemplate',
      crd: true,
    });
  }
};

@Provided(provider)
export class KubeTektonTriggerTemplate extends AbstractKubernetesResourceManager<TriggerTemplate> {
  constructor(props: Props) {
    super(props);
  }
}
