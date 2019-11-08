import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {KubeClient} from './client';

export interface RoleRef {
  apiGroup: string;
  kind: string;
  name: string;
}

export interface RoleSubject {
  kind: string;
  name: string;
  namespace: string;
}

export interface RoleBinding extends KubeResource {
  roleRef: RoleRef;
  subjects: RoleSubject[];
}

const provider: Provider = {
  get: () => {
    return new KubeRoleBinding({
      client: Container.get(KubeClient),
      group: 'rbac.authorization.k8s.io',
      version: 'v1',
      kind: 'rolebindings'
    });
  }
};

@Provided(provider)
export class KubeRoleBinding extends AbstractKubernetesResourceManager<RoleBinding> {
  constructor(props: Props) {
    super(props);
  }

  updateWithNamespace(obj: RoleBinding, namespace: string): RoleBinding {
    const subjects = obj.subjects.map(subject => Object.assign(
      {},
      subject,
      {
        namespace,
      }
    ));

    return Object.assign(
      {},
      super.updateWithNamespace(obj, namespace),
      {
        subjects
      }
    );
  }
}
