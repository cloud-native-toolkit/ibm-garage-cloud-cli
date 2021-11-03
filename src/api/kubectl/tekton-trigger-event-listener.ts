import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {AbstractKubernetesNamespacedResource, KubeResource, Props} from './kubernetes-resource-manager';

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
    V0_6 = '0.6.0',
    V1_14 = '1.14.2'
}

export type TriggerDefinition = TriggerDefinition_v0_4 | TriggerDefinition_v0_6 | TriggerDefinition_v1_14;

export interface TriggerEventListener<T extends TriggerDefinition> extends KubeResource {
    spec: {
        serviceAccountName: string;
        triggers: Array<T>;
    };
}

export type TriggerBinding_v0_6 = TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6;
export type TriggerBindings = TriggerBinding_v0_6 | TriggerBindingRef_v0_4;
export type TriggerBindingsArrays = Array<TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6> | Array<TriggerBindingRef_v0_4>;

export function isTriggerTemplate_v1_14(template: TriggerTemplateRef | TriggerTemplateRef_v1_14): template is TriggerTemplateRef_v1_14 {
    return !!template && !!(template as TriggerTemplateRef_v1_14).ref;
}

export function isTriggerBinding_v0_6(binding: TriggerBindings): binding is TriggerBinding_v0_6 {
    return !!binding && (!!(binding as TriggerBindingRef_v0_6).ref || !!(binding as TriggerBindingEmbedded_v0_6).name);
}

export interface TriggerTemplateRef {
    name: string;
}

export interface TriggerTemplateRef_v1_14 {
    ref: string;
}

export interface TriggerDefinition_v1_14 {
    name: string;
    bindings: Array<TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6>;
    template: TriggerTemplateRef_v1_14;
    interceptors: Array<{
        cel: {
            filter: string;
        }
    }>
}

export interface TriggerDefinition_v0_6 {
    name: string;
    bindings: Array<TriggerBindingRef_v0_6 | TriggerBindingEmbedded_v0_6>;
    template: TriggerTemplateRef;
    interceptors: Array<{
        cel: {
            filter: string;
        }
    }>
}

export interface TriggerDefinition_v0_4 {
    name: string;
    bindings: Array<TriggerBindingRef_v0_4>;
    template: TriggerTemplateRef;
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
export class KubeTektonTriggerEventListener extends AbstractKubernetesNamespacedResource<TriggerEventListener<TriggerDefinition_v0_4 | TriggerDefinition_v0_6 | TriggerDefinition_v1_14>> {
    constructor(props: Props) {
        super(props);
    }
}
