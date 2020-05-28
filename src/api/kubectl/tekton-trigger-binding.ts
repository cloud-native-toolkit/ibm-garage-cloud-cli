import { Container, Provided, Provider } from 'typescript-ioc';

import { AsyncKubeClient, KubeClient } from './client';
import { AbstractKubernetesResourceManager, KubeResource, Props } from './kubernetes-resource-manager';

export interface TriggerBinding extends KubeResource {
    spec: {
        params: Array<{
            name: string
            value: string
        }>
    };
}

const provider: Provider = {
    get: () => {
        return new KubeTektonTriggerBinding({
            client: Container.get(AsyncKubeClient),
            group: 'tekton.dev',
            version: 'v1alpha1',
            name: 'triggerbindings',
            kind: 'TriggerBinding',
            crd: true,
        });
    }
};

@Provided(provider)
export class KubeTektonTriggerBinding extends AbstractKubernetesResourceManager<TriggerBinding> {
    constructor(props: Props) {
        super(props);
    }
}
