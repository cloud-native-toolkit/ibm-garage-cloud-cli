import {Container} from 'typescript-ioc';
import {Namespace, NamespaceImpl} from './namespace';
import Mock = jest.Mock;
import {mockField, providerFromValue, setField} from '../../testHelper';
import {KubeSecret, Secret} from '../../api/kubectl';

describe('namespace', () => {
  test('canary verifies test infrastructure', () => {
     expect(true).toEqual(true);
  });

  let classUnderTest: NamespaceImpl;
  beforeEach(() => {
    classUnderTest = Container.get(Namespace);
  });

  test('should exist', () => {
    expect(classUnderTest).not.toBeUndefined();
  });

  describe('given create()', () => {
    let setupPullSecrets: Mock;
    let setupTlsSecrets: Mock;
    let copyConfigMaps: Mock;
    let copySecrets: Mock;
    let setupServiceAccountWithPullSecrets: Mock;
    beforeEach(() => {
      setupPullSecrets = mockField(classUnderTest, 'setupPullSecrets');
      setupTlsSecrets = mockField(classUnderTest, 'setupTlsSecrets');
      copyConfigMaps = mockField(classUnderTest, 'copyConfigMaps');
      copySecrets = mockField(classUnderTest, 'copySecrets');
      setupServiceAccountWithPullSecrets = mockField(classUnderTest, 'setupServiceAccountWithPullSecrets');
    });

    describe('when called', () => {
      test('then should return the namespace name', async () => {
        const namespace = 'test';

        expect(await classUnderTest.create(namespace)).toEqual(namespace);
      });

      test('then should setup pull secrets from default namespace', async () => {
        const namespace = 'test';

        await classUnderTest.create(namespace);

        expect(setupPullSecrets).toHaveBeenCalledWith(namespace, 'default');
      });

      test('then should setup tls secrets from default namespace', async () => {
        const namespace = 'test';

        await classUnderTest.create(namespace);

        expect(setupTlsSecrets).toHaveBeenCalledWith(namespace, 'default');
      });

      test('then should copy config maps in catalyst-tools group', async () => {
        const namespace = 'test';

        await classUnderTest.create(namespace);

        expect(copyConfigMaps).toHaveBeenCalledWith(namespace, 'tools');
      });

      test('then should copy secrets in catalyst-tools group', async () => {
        const namespace = 'test';

        await classUnderTest.create(namespace);

        expect(copySecrets).toHaveBeenCalledWith(namespace, 'tools');
      });

      test('then should setup service account with pull secrets', async () => {
        const namespace = 'test';

        await classUnderTest.create(namespace);

        expect(setupServiceAccountWithPullSecrets).toHaveBeenCalledWith(namespace);
      });
    });
  });

  describe('given setupPullSecretsFromDefaultNamespace()', () => {
    let copyAll: Mock;
    let buildPullSecretListOptions: Mock;
    beforeEach(() => {
      copyAll = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({
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
        test('then return false', async () => {
          expect(filter({metadata: {name: 'us-icr-io'}} as any)).toEqual(false);
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

          expect(mappedSecret.metadata.name).toEqual('us-icr-io');
          expect(mappedSecret.metadata.labels).toEqual(labels);
          expect(mappedSecret.data).toEqual(data);
        });
      });
    });
  });

  describe('given setupTlsSecretsFromDefaultNamespace()', () => {
    let copyAll: Mock;
    let buildTlsSecretListOptions: Mock;
    beforeEach(() => {
      copyAll = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({
        copyAll,
      }));

      buildTlsSecretListOptions = mockField(classUnderTest, 'buildTlsSecretListOptions');
    });

    describe('when called', () => {
      test('then copy secrets matching tls secret list options from default namespace into provided namespace', async () => {
        const options = {val: 'value'};
        buildTlsSecretListOptions.mockReturnValue(options);

        const namespace = 'test';
        await classUnderTest.setupTlsSecrets(namespace);

        expect(copyAll).toHaveBeenCalledWith(options, namespace);
        expect(buildTlsSecretListOptions).toHaveBeenCalledWith('default');
      });
    });
  });

  describe('given buildTlsSecretListOptions()', () => {
    describe('when namespace is provide', () => {
      test('then return namespace', async () => {
        const namespace = 'ns';
        expect(classUnderTest.buildTlsSecretListOptions(namespace).namespace)
          .toEqual(namespace);
      });

      test('then map should be undefined', async () => {
        expect(classUnderTest.buildTlsSecretListOptions('ns').map)
          .toBeUndefined();
      });
    });

    describe('given {filter}', () => {
      let filter: (secret: Secret) => boolean;
      beforeEach(() => {
        filter = classUnderTest.buildTlsSecretListOptions('default').filter;
      });

      describe('when data is not defined', () => {
        test('then return false', async () => {
          expect(filter({} as any)).toEqual(false);
        });
      });

      describe('when .data.tls\\.key is defined', () => {
        test('then return true', async () => {
          expect(filter({metadata: {name: 'test'}, data: {'tls.key': 'value'}} as any)).toEqual(true);
        });

        describe('and when secret name is router-certs', () => {
          test('then return false', async () => {
            expect(filter({metadata: {name: 'router-certs'}, data: {'tls.key': 'value'}} as any)).toEqual(false);
          });
        });

        describe('and when secret name is router-wildcard-certs', () => {
          test('then return false', async () => {
            expect(filter({metadata: {name: 'router-wildcard-certs'}, data: {'tls.key': 'value'}} as any)).toEqual(false);
          });
        });
      });

      describe('when .data.tls\\.key is not defined', () => {
        test('then return false', async () => {
          expect(filter({data: {value: 'value'}} as any)).toEqual(false);
        });
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
});
