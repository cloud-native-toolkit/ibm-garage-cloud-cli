import {Inject, Provides} from 'typescript-ioc';

import {ChildProcess} from '../../util/child-process';
import {KubeServiceAccount} from '../../api/kubectl/service-account';

export abstract class CreateServiceAccount {
  async abstract create(namespace: string, name: string, sccs?: string[], roles?: string[]);
}

@Provides(CreateServiceAccount)
export class CreateServiceAccountImpl implements CreateServiceAccount {
  @Inject
  serviceAccount: KubeServiceAccount;
  @Inject
  childProcess: ChildProcess;

  async create(namespace: string, name: string, sccs: string[] = [], roles: string[] = []) {
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
  }
}
