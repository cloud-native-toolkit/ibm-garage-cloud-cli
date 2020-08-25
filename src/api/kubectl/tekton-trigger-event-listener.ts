import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface TriggerBindingRef {
    name: string;
}

export interface TriggerBindingRef_v0_6 {
    ref: string;
}

export interface TriggerBindingEmbedded_v0_6 {
    name: string;
    spec: {
        params: [{
          name: string;
          value: string;
        }]
    }
}

export interface TriggerEventListener_v0_6 extends KubeResource {
    spec: {
        serviceAccountName: string;
        triggers: Array<{
            name: string;
            bindings: Array<TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6>;
            template: {
                name: string;
            }
            interceptors: Array<{
                cel: {
                    filter: string;
                }
            }>
        }>
    };

}

export interface TriggerEventListener extends KubeResource {
    spec: {
        serviceAccountName: string;
        triggers: Array<{
            name: string;
            bindings: Array<TriggerBindingRef>;
            template: {
                name: string;
            }
            interceptors: Array<{
                cel: {
                    filter: string;
                }
            }>
        }>
    };
}

const factory: ObjectFactory = (context: BuildContext) => {
    return new KubeTektonTriggerEventListener({
        client: context.resolve(AsyncKubeClient),
        group: 'triggers.tekton.dev',
        version: 'v1alpha1',
        name: 'eventlisteners',
        kind: 'EventListener',
        crd: true,
    });
};

@Factory(factory)
export class KubeTektonTriggerEventListener extends AbstractKubernetesResourceManager<TriggerEventListener | TriggerEventListener_v0_6> {
    constructor(props: Props) {
        super(props);
    }
}
