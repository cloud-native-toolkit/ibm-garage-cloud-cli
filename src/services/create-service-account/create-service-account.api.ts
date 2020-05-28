import {RoleRule} from '../../api/kubectl';

export abstract class CreateServiceAccount {
  async abstract createOpenShift(namespace: string, name: string, sccs?: string[], roles?: string[], secrets?: string[]): Promise<string>;
  async abstract createKubernetes(namespace: string, name: string, rules?: RoleRule[]): Promise<string>;
}
