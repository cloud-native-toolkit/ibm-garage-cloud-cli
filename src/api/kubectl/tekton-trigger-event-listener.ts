import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface TriggerBindingRef_v0_4 {
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

export enum TriggerDefinitionVersion {
    V0_4 = '0.4.0',
    V0_6 = '0.6.0'
}

export type TriggerDefinition = TriggerDefinition_v0_4 | TriggerDefinition_v0_6;

export interface TriggerEventListener<T extends TriggerDefinition> extends KubeResource {
    spec: {
        serviceAccountName: string;
        triggers: Array<T>;
    };
}

export type TriggerBinding_v0_6 = TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6;
export type TriggerBindings = TriggerBinding_v0_6 | TriggerBindingRef_v0_4;
export type TriggerBindingsArrays = Array<TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6> | Array<TriggerBindingRef_v0_4>;

export function isTriggerBinding_v0_6(binding: TriggerBindings): binding is TriggerBinding_v0_6 {
    return !!binding && (!!(binding as TriggerBindingRef_v0_6).ref || !!(binding as TriggerBindingEmbedded_v0_6).name);
}

export interface TriggerDefinition_v0_6 {
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
}

export interface TriggerDefinition_v0_4 {
    name: string;
    bindings: Array<TriggerBindingRef_v0_4>;
    template: {
        name: string;
    }
    interceptors: Array<{
        cel: {
            filter: string;
        }
    }>
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
export class KubeTektonTriggerEventListener extends AbstractKubernetesResourceManager<TriggerEventListener<TriggerDefinition_v0_4 | TriggerDefinition_v0_6>> {
    constructor(props: Props) {
        super(props);
    }
}
