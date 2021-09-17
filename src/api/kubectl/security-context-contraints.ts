import {AbstractKubernetesClusterResource, KubeMetadata, KubeResource, Props} from './kubernetes-resource-manager';
import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';

export interface SecurityContextContraints<M = KubeMetadata> extends KubeResource<M> {
  users: string[];
  groups: string[];
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeSecurityContextConstraints({
    client: context.resolve(AsyncKubeClient),
    group: 'security.openshift.io',
    version: 'v1',
    name: 'securitycontextconstraints',
    kind: 'SecurityContextConstraints',
    crd: true,
  })
}

@Factory(factory)
export class KubeSecurityContextConstraints extends AbstractKubernetesClusterResource<SecurityContextContraints> {
  constructor(props: Props) {
    super(props);
  }
}
