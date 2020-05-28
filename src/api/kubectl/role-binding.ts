import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

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

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeRoleBinding({
    client: context.resolve(AsyncKubeClient),
    group: 'rbac.authorization.k8s.io',
    version: 'v1',
    name: 'rolebindings',
    kind: 'RoleBinding',
  });
};

@Factory(factory)
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

  async addSubject(name: string, subject: RoleSubject, namespace: string): Promise<RoleBinding> {
    const roleBinding: RoleBinding = await this.get(name, namespace);

    if (!roleBinding.subjects.includes(subject)) {
      roleBinding.subjects.push(subject);

      return this.update(name, {body: roleBinding}, namespace);
    }

    return roleBinding;
  }
}
