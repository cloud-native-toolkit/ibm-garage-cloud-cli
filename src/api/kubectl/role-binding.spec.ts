import {KubeRoleBinding, RoleBinding} from './role-binding';
import {Container} from 'typescript-ioc';

describe('role-binding', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: KubeRoleBinding;
  beforeEach(() => {
    classUnderTest = Container.get(KubeRoleBinding);
  });

  describe('given updateWithNamespace()', () => {
    describe('when called', () => {
      test('then update the namespace of each subject and in the metadata', () => {
        const roleBinding: RoleBinding = {
          metadata: {
            name: 'name',
            namespace: 'ns',
          },
          roleRef: {
            apiGroup: 'group',
            kind: 'Role',
            name: 'name'
          },
          subjects: [{
            kind: 'ServiceAccount',
            name: 'name',
            namespace: 'ns',
          }],
        };
        const toNamespace = 'toNamespace';

        const result = classUnderTest.updateWithNamespace(roleBinding, toNamespace);

        expect(result.metadata.namespace).toEqual(toNamespace);
        expect(result.subjects[0].namespace).toEqual(toNamespace);
      });
    });
  });
});
