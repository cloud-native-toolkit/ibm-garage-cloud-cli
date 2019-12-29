import {Container, Provided, Provider} from 'typescript-ioc';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {KubeKindBuilder} from './kind-builder';

export interface RoleRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface Role extends KubeResource {
  rules: RoleRule[];
}

const provider: Provider = {
  get: () => {
    return new KubeRole({
      client: Container.get(KubeKindBuilder),
      group: 'rbac.authorization.k8s.io',
      version: 'v1',
      name: 'role',
      kind: 'Role',
    });
  }
};

@Provided(provider)
export class KubeRole extends AbstractKubernetesResourceManager<Role> {
  constructor(props: Props) {
    super(props);
  }
}
