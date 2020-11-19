import {Container} from 'typescript-ioc';
import {NamespaceImpl} from './namespace';
import {factoryFromValue, mockField} from '../../testHelper';
import {
  KubeNamespace,
  KubeRole,
  KubeRoleBinding,
  KubeSecret,
  KubeServiceAccount,
  Secret,
  ServiceAccount
} from '../../api/kubectl';
import {ClusterType} from '../../util/cluster-type';
import {NamespaceOptionsModel} from './namespace-options.model';
import {ChildProcess} from '../../util/child-process';
import Mock = jest.Mock;

describe('namespace', () => {
  test('canary verifies test infrastructure', () => {
     expect(true).toEqual(true);
  });

  let classUnderTest: NamespaceImpl;

  let getClusterType: Mock;
  let kubeNamespace_exists: Mock;
  let kubeNamespace_create: Mock;
  let serviceAccounts_get: Mock;
  let serviceAccounts_update: Mock;
  let serviceAccounts_copy: Mock;
  let serviceAccounts_exists: Mock;
  let secrets_list: Mock;
  let secrets_copy: Mock;
  let roles_copy: Mock;
  let roles_addRules: Mock;
  let roleBindings_copy: Mock;
  let roleBindings_addSubject: Mock;
  let childProcess_exec: Mock;
  beforeEach(() => {
    getClusterType = jest.fn();
    Container.bind(ClusterType).factory(factoryFromValue({
      getClusterType
    }));

    kubeNamespace_create = jest.fn();
    kubeNamespace_exists = jest.fn();

    Container.bind(KubeNamespace).factory(factoryFromValue({
      create: kubeNamespace_create,
      exists: kubeNamespace_exists,
    }));

    serviceAccounts_get = jest.fn();
    serviceAccounts_update = jest.fn();
    serviceAccounts_copy = jest.fn();
    serviceAccounts_exists = jest.fn();
    Container.bind(KubeServiceAccount).factory(factoryFromValue({
      get: serviceAccounts_get,
      update: serviceAccounts_update,
      copy: serviceAccounts_copy,
      exists: serviceAccounts_exists,
    }));

    secrets_list = jest.fn();
    secrets_copy = jest.fn();
    Container.bind(KubeSecret).factory(factoryFromValue({
      list: secrets_list,
      copy: secrets_copy,
    }));

    roles_copy = jest.fn();
    roles_addRules = jest.fn();
    Container.bind(KubeRole).factory(factoryFromValue({
      copy: roles_copy,
      addRules: roles_addRules,
    }));

    roleBindings_copy = jest.fn();
    roleBindings_addSubject = jest.fn();
    Container.bind(KubeRoleBinding).factory(factoryFromValue({
      copy: roleBindings_copy,
      addSubject: roleBindings_addSubject,
    }));

    childProcess_exec = jest.fn();
    Container.bind(ChildProcess).factory(factoryFromValue({
      exec: childProcess_exec
    }));

    classUnderTest = Container.get(NamespaceImpl);
  });

  test('should exist', () => {
    expect(classUnderTest).not.toBeUndefined();
  });

  describe('given getCurrentProject()', () => {
    const defaultValue = 'default value';

    describe('when current context result not found', () => {
      beforeEach(() => {
        childProcess_exec.mockResolvedValueOnce({stdout: ''});
      });

      test('then return the default value', async () => {
        expect(await classUnderTest.getCurrentProject(defaultValue))
          .toEqual(defaultValue);
      });
    });

    describe('when current context result is an empty string', () => {
      beforeEach(() => {
        childProcess_exec.mockResolvedValueOnce({stdout: '   '});
      });

      test('then return the default value', async () => {
        expect(await classUnderTest.getCurrentProject(defaultValue))
          .toEqual(defaultValue);
      });
    });

    describe('when current context contains a value', () => {
      const currentContext = 'currentContext';

      beforeEach(() => {
        childProcess_exec.mockResolvedValueOnce({stdout: 'currentContext'});
      });

      describe('and when the current namespace is defined', () => {
        const currentNamespace = 'test'
        beforeEach(() => {
          childProcess_exec.mockResolvedValueOnce({stdout: currentNamespace});
        });

        test('then pass the current context to `kubectl config view` command', async () => {
          await classUnderTest.getCurrentProject(defaultValue);

          expect(childProcess_exec.mock.calls[1][0])
            .toEqual(`kubectl config view -o jsonpath='{.contexts[?(@.name=="\'${currentContext}\'")].context.namespace}'`)
        });

        test('then return the default value', async () => {
          expect(await classUnderTest.getCurrentProject(defaultValue))
            .toEqual(currentNamespace);
        });
      });

      describe('and when the current namespace is `default`', () => {
        const currentNamespace = 'default'
        beforeEach(() => {
          childProcess_exec.mockResolvedValueOnce({stdout: currentNamespace});
        });

        test('then return the default value', async () => {
          expect(await classUnderTest.getCurrentProject(defaultValue))
            .toEqual(defaultValue);
        });
      });
    });

    describe('when current context value is wrapped in single quotes', () => {
      const currentContext = 'currentContext';

      beforeEach(() => {
        childProcess_exec.mockResolvedValueOnce({stdout: '\'currentContext\''});
        childProcess_exec.mockResolvedValueOnce({stdout: 'mynamespace'});
      });

      test('then pass the current context to `kubectl config view` command', async () => {
        await classUnderTest.getCurrentProject(defaultValue);

        expect(childProcess_exec.mock.calls[1][0])
          .toEqual(`kubectl config view -o jsonpath='{.contexts[?(@.name=="\'${currentContext}\'")].context.namespace}'`)
      });
    });

    describe('when current context value is wrapped in double quotes', () => {
      const currentContext = 'currentContext';

      beforeEach(() => {
        childProcess_exec.mockResolvedValueOnce({stdout: '"currentContext"'});
        childProcess_exec.mockResolvedValueOnce({stdout: 'mynamespace'});
      });

      test('then pass the current context to `kubectl config view` command', async () => {
        await classUnderTest.getCurrentProject(defaultValue);

        expect(childProcess_exec.mock.calls[1][0])
          .toEqual(`kubectl config view -o jsonpath='{.contexts[?(@.name=="\'${currentContext}\'")].context.namespace}'`)
      });
    });
  });

  describe('given create()', () => {
    let setupPullSecrets: Mock;
    let setupTlsSecrets: Mock;
    let copyConfigMaps: Mock;
    let copySecrets: Mock;
    let setupServiceAccountWithPullSecrets: Mock;
    let copyJenkinsCredentials: Mock;
    let copyPipelines: Mock;
    let setCurrentProject: Mock;
    beforeEach(() => {
      setupPullSecrets = mockField(classUnderTest, 'setupPullSecrets');
      setupTlsSecrets = mockField(classUnderTest, 'setupTlsSecrets');
      copyConfigMaps = mockField(classUnderTest, 'copyConfigMaps');
      copySecrets = mockField(classUnderTest, 'copySecrets');
      setupServiceAccountWithPullSecrets = mockField(classUnderTest, 'setupServiceAccountWithPullSecrets');
      copyJenkinsCredentials = mockField(classUnderTest, 'copyJenkinsCredentials');
      copyPipelines = mockField(classUnderTest, 'copyPipelines');
      setCurrentProject = mockField(classUnderTest, 'setCurrentProject');
    });

    describe('when clusterType is kubernetes', () => {
      const namespace = 'test';
      const templateNamespace = 'other';
      const serviceAccount = 'sa';
      const namespaceOptions: NamespaceOptionsModel = {namespace, templateNamespace, serviceAccount, dev: false};

      beforeEach(() => {
        getClusterType.mockResolvedValue('kubernetes');
      });

      test('then should return the namespace name', async () => {
        expect(await classUnderTest.create(namespaceOptions)).toEqual(namespace);
      });

      describe('and when namespace exists', () => {
        test('then should not create it', async () => {
          kubeNamespace_exists.mockResolvedValue(true);

          expect(await classUnderTest.create(namespaceOptions)).toEqual(namespace);

          expect(kubeNamespace_create).not.toHaveBeenCalled();
        });
      });

      describe('and when namespace does not exists', () => {
        test('then it should create it', async () => {
          kubeNamespace_exists.mockResolvedValue(false);

          expect(await classUnderTest.create(namespaceOptions)).toEqual(namespace);

          expect(kubeNamespace_create).toHaveBeenCalledWith(namespace);
        });
      });

      describe('and when dev flag is false', () => {
        beforeEach(() => {
          namespaceOptions.dev = false;
        });

        test('then should copy the jenkins credentials', async () => {
          await classUnderTest.create(namespaceOptions);

          expect(copyJenkinsCredentials).not.toHaveBeenCalled();
        });
      });

      describe('and when dev flag is true', () => {
        beforeEach(() => {
          namespaceOptions.dev = true;
        });

        test('then should copy config maps in catalyst-tools group', async () => {
          await classUnderTest.create(namespaceOptions);

          expect(copyConfigMaps).toHaveBeenCalledWith(namespace, templateNamespace);
        });

        test('then should copy secrets in catalyst-tools group', async () => {
          await classUnderTest.create(namespaceOptions);

          expect(copySecrets).toHaveBeenCalledWith(namespace, templateNamespace);
        });

        test('then should not copy the jenkins credentials', async () => {
          await classUnderTest.create(namespaceOptions);

          expect(copyJenkinsCredentials).not.toHaveBeenCalledWith();
        });
      });
    });
  });

  describe('given setupPullSecretsFromDefaultNamespace()', () => {
    let copyAll: Mock;
    let buildPullSecretListOptions: Mock;
    beforeEach(() => {
      copyAll = jest.fn();
      Container.bind(KubeSecret).factory(factoryFromValue({
        copyAll,
      }));

      buildPullSecretListOptions = mockField(classUnderTest, 'buildPullSecretListOptions');
    });

    describe('when called', () => {
      test('then copy secrets matching pull secret list options from default namespace into provided namespace', async () => {
        const options = {val: 'value'};
        buildPullSecretListOptions.mockReturnValue(options);

        const namespace = 'test';
        await classUnderTest.setupPullSecrets(namespace);

        expect(copyAll).toHaveBeenCalledWith(options, namespace);
        expect(buildPullSecretListOptions).toHaveBeenCalledWith('default');
      });
    });
  });

  describe('given buildPullSecretListOptions()', () => {
    describe('when namespace is provide', () => {
      test('then return namespace', async () => {
        const namespace = 'ns';
        expect(classUnderTest.buildPullSecretListOptions(namespace).namespace)
          .toEqual(namespace);
      });
    });

    describe('given {filter}', () => {
      let filter: (secret: Secret) => boolean;
      beforeEach(() => {
        filter = classUnderTest.buildPullSecretListOptions('default').filter;
      });

      describe('when secret name is "default-icr-io"', () => {
        test('then return true', async () => {
          expect(filter({metadata: {name: 'default-icr-io'}} as any)).toEqual(true);
        });
      });

      describe('when secret name is "default-us-icr-io"', () => {
        test('then return true', async () => {
          expect(filter({metadata: {name: 'default-us-icr-io'}} as any)).toEqual(true);
        });
      });

      describe('when secret name is "us-icr-io"', () => {
        test('then return true', async () => {
          expect(filter({metadata: {name: 'us-icr-io'}} as any)).toEqual(true);
        });
      });
    });

    describe('given {map}', () => {
      let map: (secret: Secret) => Secret;
      beforeEach(() => {
        map = classUnderTest.buildPullSecretListOptions('default').map;
      });

      describe('when called with secret name "default-us-icr-io"', () => {
        test('then return secret with name "us-icr-io"', async () => {
          const data = {value: 'value'};
          const labels = {label: 'label'};

          const secret: Secret = {
            type: 'Secret',
            metadata: {
              name: 'default-us-icr-io',
              labels,
            },
            data,
          };

          const mappedSecret: Secret = map(secret);

          expect(mappedSecret.metadata.name).toEqual('default-us-icr-io');
          expect(mappedSecret.metadata.labels).toEqual(labels);
          expect(mappedSecret.data).toEqual(data);
        });
      });
    });
  });

  describe('given setupServiceAccountWithPullSecrets()', () => {
    const serviceAccount = {val: 'value'};
    const serviceAccountName = 'my-serviceaccount';

    let containsPullSecretsMatchingPattern: Mock;
    let updateServiceAccountWithPullSecretsMatchingPattern: Mock;
    beforeEach(() => {
      containsPullSecretsMatchingPattern = mockField(classUnderTest, 'containsPullSecretsMatchingPattern');
      updateServiceAccountWithPullSecretsMatchingPattern = mockField(classUnderTest, 'updateServiceAccountWithPullSecretsMatchingPattern');

      serviceAccounts_exists.mockResolvedValue(true);
      serviceAccounts_get.mockResolvedValue(serviceAccount);
    });

    describe('when service account does not contain pull secrets', () => {
      beforeEach(() => {
        containsPullSecretsMatchingPattern.mockReturnValue(false);
      });

      test('then do not update the secrets', async () => {
        const namespace = 'ns';

        const updatedServiceAccount = {val: 'value2'};
        updateServiceAccountWithPullSecretsMatchingPattern.mockResolvedValue(updatedServiceAccount)

        await classUnderTest.setupServiceAccountWithPullSecrets(namespace, serviceAccountName);

        const pullSecretPattern = '.*icr-io';
        expect(updateServiceAccountWithPullSecretsMatchingPattern).toHaveBeenCalledWith(
          serviceAccount,
          pullSecretPattern
        );
        expect(serviceAccounts_update).toHaveBeenCalledWith(
          serviceAccountName,
          {body: updatedServiceAccount},
          namespace,
        );
      });
    });
  });

  describe('given containsPullSecretsMatchingPattern()', () => {
    describe('when imagePullSecrets is undefined', () => {
      test('then return false', async () => {
        expect(classUnderTest.containsPullSecretsMatchingPattern({} as any, 'test'))
          .toEqual(false);
      });
    });

    describe('when imagePullSecrets contains element with name matching pattern', () => {
      test('then return true', async () => {
        const actualResult = classUnderTest.containsPullSecretsMatchingPattern(
          {
            imagePullSecrets: [
              {name: 'default-us-icr-io'},
              {name: 'no-match'},
            ],
          } as any,
          '.*-icr-io',
        );

        expect(actualResult).toEqual(true);
      });
    });

    describe('when imagePullSecrets does not contain an element with name matching pattern', () => {
      test('then return false', async () => {
        const actualResult = classUnderTest.containsPullSecretsMatchingPattern(
          {
            imagePullSecrets: [
              {name: 'no-match'},
              {name: 'another-non-match'},
            ],
          } as any,
          '.*-icr-io',
        );

        expect(actualResult).toEqual(false);
      });
    });
  });

  describe('given updateServiceAccountWithPullSecretsMatchingPattern()', () => {
    let listMatchingSecrets: Mock;
    beforeEach(() => {
      listMatchingSecrets = mockField(classUnderTest, 'listMatchingSecrets');
    });

    describe('when called', () => {
      test('then add matching secrets to list', async () => {
        const secrets = [{name: 'secret1'}, {name: 'secret2'}];
        listMatchingSecrets.mockResolvedValue(secrets);

        const serviceAccount: ServiceAccount = {
          kind: 'ServiceAccount',
          metadata: {
            name: 'default'
          },
          imagePullSecrets: [{name: 'original-secret'}]
        };
        const pullSecretPattern = 'pattern';
        const actualResult: ServiceAccount = await classUnderTest.updateServiceAccountWithPullSecretsMatchingPattern(
          serviceAccount,
          pullSecretPattern,
        );

        expect(actualResult.imagePullSecrets).toEqual([{name: 'original-secret'}, {name: 'secret1'}, {name: 'secret2'}]);
      });
    });
  });

  describe('given listMatchingSecrets()', () => {
    describe('when secrets match', () => {
      test('then return secret names', async () => {
        const name1 = 'au-icr-io';
        const name2 = 'de-icr-io';
        const name3 = 'icr-io';
        const name4 = 'jp-icr-io';
        const name5 = 'uk-icr-io';
        const name6 = 'us-icr-io';
        secrets_list.mockResolvedValue([
          {metadata: {name: name1}},
          {metadata: {name: name2}},
          {metadata: {name: name3}},
          {metadata: {name: name4}},
          {metadata: {name: name5}},
          {metadata: {name: name6}},
          {metadata: {name: 'another-secret'}},
        ]);

        const actualResult: Array<{name: string}> = await classUnderTest.listMatchingSecrets(
          '.*icr-io',
          'test'
        );

        console.log('Actual result: ', actualResult);
        expect(actualResult)
          .toEqual([
            {name: name1},
            {name: name2},
            {name: name3},
            {name: name4},
            {name: name5},
            {name: name6},
          ]);
      });
    });
  });

  describe('given copyJenkinsCredentials()', () => {
    let copyServiceAccount: Mock;
    beforeEach(() => {
      copyServiceAccount = mockField(classUnderTest, 'copyServiceAccount');
    });

    describe('when called', () => {
      test('then copy service account, role, and roleBinding', async () => {
        const toNamespace = 'toNamespace';
        const fromNamespace = 'fromNamespace';

        await classUnderTest.copyJenkinsCredentials(fromNamespace, toNamespace);

        expect(roles_copy).toHaveBeenCalledWith(
          'jenkins-schedule-agents',
          fromNamespace,
          toNamespace,
        );
        expect(roleBindings_copy).toHaveBeenCalledWith(
          'jenkins-schedule-agents',
          fromNamespace,
          toNamespace,
        );
        expect(copyServiceAccount).toHaveBeenCalledWith(
          'jenkins',
          fromNamespace,
          toNamespace,
        );
      });
    });
  });

  describe('given copyServiceAccount()', () => {
    let getServiceAccountSecretNames: Mock;
    beforeEach(() => {
      getServiceAccountSecretNames = mockField(classUnderTest, 'getServiceAccountSecretNames');
    });

    describe('when called', () => {
      test('then copy the service account', async () => {
        getServiceAccountSecretNames.mockReturnValue([]);

        const name = 'name';
        const toNamespace = 'toNamespace';
        const fromNamespace = 'fromNamespace';
        await classUnderTest.copyServiceAccount(name, fromNamespace, toNamespace);

        expect(serviceAccounts_copy).toHaveBeenCalledWith(name, fromNamespace, toNamespace);
      });

      test('then copy all of the service account secrets', async () => {
        const name1 = 'name1';
        const name2 = 'name2';
        const name3 = 'name3';
        const serviceAccount: ServiceAccount = {
          kind: 'ServiceAccount',
          metadata: {
            name: 'test',
          },
        };
        serviceAccounts_copy.mockResolvedValue(serviceAccount);
        getServiceAccountSecretNames.mockReturnValue([name1, name2, name2]);

        const name = 'name';
        const toNamespace = 'toNamespace';
        const fromNamespace = 'fromNamespace';
        await classUnderTest.copyServiceAccount(name, fromNamespace, toNamespace);

        expect(serviceAccounts_copy).toHaveBeenCalledWith(name, fromNamespace, toNamespace);
        expect(secrets_copy).toHaveBeenCalledTimes(3);
      });
    })
  })

  describe('given getServiceAccountSecretNames()', () => {
    describe('when serviceAccount is undefined', () => {
      test('then return empty array', () => {
        expect(classUnderTest.getServiceAccountSecretNames()).toEqual([]);
      });
    });

    describe('when serviceAccount is empty object', () => {
      test('then return empty array', () => {
        expect(classUnderTest.getServiceAccountSecretNames({} as any)).toEqual([]);
      });
    });

    describe('when serviceAccount has secrets and imagePullSecrets', () => {
      test('then return secret names', () => {
        const name1 = 'secret1';
        const name2 = 'secret2';
        const name3 = 'secret3';

        const serviceAccount: ServiceAccount = {
          metadata: {
            name: 'serviceAccount',
          },
          secrets: [{name: name1}],
          imagePullSecrets: [{name: name2}, {name: name3}]
        };

        expect(classUnderTest.getServiceAccountSecretNames(serviceAccount))
          .toEqual([name1, name2, name3]);
      });
    });

    describe('when serviceAccount has secrets and imagePullSecrets with overlapping names', () => {
      test('then return unique set of secret names', () => {
        const name1 = 'secret1';
        const name2 = 'secret2';
        const name3 = 'secret3';

        const serviceAccount: ServiceAccount = {
          metadata: {
            name: 'serviceAccount',
          },
          secrets: [{name: name1}, {name: name2}],
          imagePullSecrets: [{name: name2}, {name: name3}]
        };

        expect(classUnderTest.getServiceAccountSecretNames(serviceAccount))
          .toEqual([name1, name2, name3]);
      });
    });
  });
});
