import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface RoleRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface ResourceRoleRule {
  apiGroup?: string;
  resource: string;
  verbs: string[];
}

export interface Role extends KubeResource {
  rules: RoleRule[];
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeRole({
    client: context.resolve(AsyncKubeClient),
    group: 'rbac.authorization.k8s.io',
    version: 'v1',
    name: 'role',
    kind: 'Role',
  });
};

@Factory(factory)
export class KubeRole extends AbstractKubernetesResourceManager<Role> {
  constructor(props: Props) {
    super(props);
  }

  async addRules(name: string, rules: ResourceRoleRule[], namespace: string = 'default'): Promise<Role> {
    const role: Role = await this.get(name, namespace);

    let rulesChanged = false;
    const newRules: RoleRule[] = rules.reduce((processedRules: RoleRule[], rule: ResourceRoleRule) => {
      const matchingRole: RoleRule = findMatchingRule(rule, role.rules);

      if (matchingRole) {
        rulesChanged = true;
        reconcileVerbsInPlace(matchingRole, rule.verbs);
      } else {
        processedRules.push({
          apiGroups: [rule.apiGroup],
          resources: [rule.resource],
          verbs: rule.verbs,
        });
      }

      return processedRules;
    }, []);

    if (newRules.length > 0 || rulesChanged) {
      role.rules = role.rules.concat(newRules);

      return this.update(name, {body: role}, namespace);
    } else {
      return role;
    }
  }
}

function findMatchingRule(resourceRule: ResourceRoleRule, rules: RoleRule[]): RoleRule | undefined {
  const matchingRules: RoleRule[] = rules.filter(rule => {
    return rule.apiGroups.includes(resourceRule.apiGroup || "") &&
      rule.resources.includes(resourceRule.resource);
  });

  if (matchingRules.length > 0) {
    return matchingRules[0];
  }
}

function reconcileVerbsInPlace(rule: RoleRule, verbs: string[]): string[] {
  if (verbs === ['*'] || rule.verbs === ['*']) {
    rule.verbs = ['*'];
    return verbs;
  }

  const distinct = (value: string, index: number, self: string[]) => {
    return self.indexOf(value) === index;
  };

  rule.verbs = rule.verbs.concat(verbs).filter(distinct);

  return rule.verbs;
}