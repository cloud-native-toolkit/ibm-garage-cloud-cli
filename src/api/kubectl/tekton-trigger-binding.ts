import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface TriggerBinding extends KubeResource {
    spec: {
        params: Array<{
            name: string
            value: string
        }>
    };
}

const factory: ObjectFactory = (context: BuildContext) => {
    return new KubeTektonTriggerBinding({
        client: context.resolve(AsyncKubeClient),
        group: 'triggers.tekton.dev',
        version: 'v1alpha1',
        name: 'triggerbindings',
        kind: 'TriggerBinding',
        crd: true,
    });
};

@Factory(factory)
export class KubeTektonTriggerBinding extends AbstractKubernetesResourceManager<TriggerBinding> {
    constructor(props: Props) {
        super(props);
    }
}
