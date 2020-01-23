import {Inject, Provides} from 'typescript-ioc';

import {ChildProcess} from '../../util/child-process';
import {KubeServiceAccount, ServiceAccount} from '../../api/kubectl/service-account';
import {KubeRole, Role, RoleRule} from '../../api/kubectl/role';
import {KubeRoleBinding, RoleBinding} from '../../api/kubectl/role-binding';

export abstract class CreateServiceAccount {
  async abstract createOpenShift(namespace: string, name: string, sccs?: string[], roles?: string[]): Promise<string>;
  async abstract createKubernetes(namespace: string, name: string, rules?: RoleRule[]): Promise<string>;
}

@Provides(CreateServiceAccount)
export class CreateServiceAccountImpl implements CreateServiceAccount {
  @Inject
  serviceAccount: KubeServiceAccount;
  @Inject
  role: KubeRole;
  @Inject
  roleBinding: KubeRoleBinding;
  @Inject
  childProcess: ChildProcess;

  async createOpenShift(namespace: string, name: string, sccs: string[] = [], roles: string[] = []): Promise<string> {
    if (!(await this.serviceAccount.exists(name, namespace))) {
      console.log(`Creating service account: ${namespace}/${name}`);
      await this.childProcess.exec(`oc create serviceaccount ${name} -n ${namespace}`);
    }

    for (const scc of sccs) {
      await this.childProcess.exec(`oc adm policy add-scc-to-user ${scc} -z ${name} -n ${namespace}`);
    }

    for (const role of roles) {
      await this.childProcess.exec(`oc adm policy add-role-to-user ${role} -z ${name} -n ${namespace}`);
    }

    return name;
  }

  async createKubernetes(namespace: string, name: string, rules: RoleRule[] = []): Promise<string> {

    const serviceAccount: ServiceAccount = {
      metadata: {
        name
      }
    };
    await this.serviceAccount.createOrUpdate(name, {body: serviceAccount}, namespace);

    if (rules.length > 0) {
      const role: Role = {
        metadata: {
          name,
        },
        rules
      };
      await this.role.createOrUpdate(name, {body: role}, namespace);

      const roleBinding: RoleBinding = {
        metadata: {
          name,
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name
        },
        subjects: [{
          kind: 'ServiceAccount',
          name,
          namespace
        }]
      };
      await this.roleBinding.createOrUpdate(name, {body: roleBinding}, namespace);
    }

    return name;
  }

}
