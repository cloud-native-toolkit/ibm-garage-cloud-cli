import { Container, Provided, Provider } from 'typescript-ioc';

import { AsyncKubeClient, KubeClient } from './client';
import { AbstractKubernetesResourceManager, KubeResource, Props } from './kubernetes-resource-manager';
import { String } from 'lodash';

export interface TriggerEventListener extends KubeResource {
    spec: {
        serviceAccountName: string,
        triggers: Array<{
            name: string
            binding: {
                name: string
            }
            template: {
                name: string
            }
            interceptors: Array<{
                cel: {
                    filter: string
                }
            }>
        }>
    };
}

const provider: Provider = {
    get: () => {
        return new KubeTektonTriggerEventListener({
            client: Container.get(AsyncKubeClient),
            group: 'tekton.dev',
            version: 'v1alpha1',
            name: 'eventlisteners',
            kind: 'EventListener',
            crd: true,
        });
    }
};

@Provided(provider)
export class KubeTektonTriggerEventListener extends AbstractKubernetesResourceManager<TriggerEventListener> {
    constructor(props: Props) {
        super(props);
    }
}
