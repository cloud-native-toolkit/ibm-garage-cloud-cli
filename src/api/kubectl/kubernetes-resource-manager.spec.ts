import {
  AbstractKubernetesResourceManager,
  KubeBody,
  KubeResource,
  KubeResourceList,
  Props
} from './kubernetes-resource-manager';
import {KubeClient} from './client';
import {buildMockKubeClient} from './testHelper';
import {Container, Provided, Provider} from 'typescript-ioc';
import {providerFromValue} from '../../testHelper';
import {Secret} from './secrets';
import Mock = jest.Mock;

class TestResource implements KubeResource {
  metadata: {
    name: string;
    namespace?: string;
    labels?: any;
    annotations?: any;
  }
}

export const testV1Provider: Provider = {
  get: () => {
    return new TestV1KubernetesResource({
      client: Container.get(KubeClient),
      kind: 'secret'
    })
  }
};

@Provided(testV1Provider)
class TestV1KubernetesResource extends AbstractKubernetesResourceManager<TestResource> {
}


export const testV1Beta1Provider: Provider = {
  get: () => {
    return new TestV1Beta1KubernetesResource({
      client: Container.get(KubeClient),
      group: 'extension',
      version: 'v1beta1',
      kind: 'ingress',
    })
  }
};

@Provided(testV1Beta1Provider)
class TestV1Beta1KubernetesResource extends AbstractKubernetesResourceManager<TestResource> {
  constructor(props: Props) {
    super(props);
  }
}

describe('kubernetes-resource-manager', () => {
  test('canary verifies test infrastructure', () => {
      expect(true).toEqual(true);
  });

  let classUnderTest: AbstractKubernetesResourceManager<TestResource>;
  let mockClient: KubeClient;
  beforeEach(() => {
    mockClient = buildMockKubeClient();

    Container.bind(KubeClient)
      .provider(providerFromValue(mockClient));
    classUnderTest = Container.get(TestV1KubernetesResource);
  });

  describe('given TestV1KubernetesResource', () => {
    describe.only('given constructor', () => {
      test('group should be undefined', () => {
        expect(classUnderTest.group).toBeUndefined();
      });

      test('version should be `v1`', () => {
        expect(classUnderTest.version).toEqual('v1');
      });

      test('kind should be `secret`', () => {
        expect(classUnderTest.kind).toEqual('secret');
      });

      test('client should not be undefined', () => {
        expect(classUnderTest.client).not.toBeUndefined();
      });
    });

    describe('given list()', () => {
      let mock_get: Mock;
      beforeEach(() => {
        mock_get = (mockClient.api.v1.namespaces as any).secrets.get;
      });

      describe('when namespace not provided', () => {
        test('then query secrets in `default` namespace', async () => {
          expect(classUnderTest.kind).toEqual('secret');

          await classUnderTest.list();

          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith('default');
        });
      });

      describe('when namespace is provided', () => {
        test('then query secrets in provided namespace', async () => {
          const expectedResult: Secret[] = [{}, {}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          await classUnderTest.list({namespace});

          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith(namespace);
        });

        test('then return list of secrets', async () => {
          const expectedResult: Secret[] = [{}, {}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          const actualResult = await classUnderTest.list({namespace});

          expect((mockClient.api.v1.namespaces as any).secrets.get).toHaveBeenCalledTimes(1);
          expect((mockClient.api.v1.namespaces as any).secrets.get).toHaveBeenCalledWith({});
          expect(actualResult).toBe(expectedResult);
        });
      });

      describe('when selector is provided', () => {
        test('then filter the results with selector', async () => {
          const expectedResult: Secret[] = [{}, {}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          (mockClient.api.v1.namespaces as any).secret.get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          const labelSelector = 'app=test';
          const actualResult = await classUnderTest.list({namespace, qs: {labelSelector}});

          expect(actualResult).toBe(expectedResult);
          expect((mockClient.api.v1.namespaces as any).secrets.get).toHaveBeenCalledWith({qs: {labelSelector}});
        });
      });
    });

    describe('given copyAll()', () => {
      let mock_list: Mock;
      let unset_list: () => void;
      let mock_create: Mock;
      let unset_create;
      beforeEach(() => {
        mock_list = jest.fn();
        unset_list = mockField(classUnderTest, 'list', mock_list);

        mock_create = jest.fn();
        unset_create = mockField(classUnderTest, 'create', mock_create);
      });

      afterEach(() => {
        unset_list();
        unset_create();
      });

      test('should call list() with provided options', async () => {
        const options = {namespace: 'ns', selector: 'app=value'};
        const toNamespace = 'toNamespace';
        await classUnderTest.copyAll(options, toNamespace);

        expect(mock_list).toBeCalledWith(options);
      });

      test('should call create() for each secret returned', async () => {
        const firstSecret = {metadata: {name: '1'}};
        const returnedSecrets = [firstSecret, {metadata: {name: '2'}}];
        mock_list.mockResolvedValue(returnedSecrets);

        const options = {namespace: 'ns', selector: 'app=value'};
        const toNamespace = 'toNamespace';
        await classUnderTest.copyAll(options, toNamespace);

        expect(mock_list).toBeCalledWith(options);
        expect(mock_create).toHaveBeenCalledTimes(2);
        expect(mock_create).toHaveBeenCalledWith(
          firstSecret.metadata.name,
          {
            body: Object.assign(
              {},
              firstSecret,
              {
                metadata: {
                  name: firstSecret.metadata.name,
                  namespace: toNamespace
                }
              }
            )
          },
          toNamespace,
        );
      });
    });

    describe('given create()', () => {
      const namespace = 'namespace';
      const secretName = 'my-secret';
      const secretBody = {body: {metadata: {name: secretName}}};

      let mock_get: Mock;
      let mock_put: Mock;
      let mock_post: Mock;

      beforeEach(() => {
        mock_get = (mockClient.api.v1.namespaces as any).secrets.get;
        mock_put = (mockClient.api.v1.namespaces as any).secrets.put;
        mock_post = (mockClient.api.v1.namespaces as any).secrets.post;
      });

      describe('when secret exists', () => {
        test('update secret with put()', async () => {
          const expectedResult = 'result';

          mock_get.mockResolvedValue('');
          mock_put.mockResolvedValue({body: expectedResult});

          const actualResult = await classUnderTest.create(secretName, secretBody, namespace);

          expect(actualResult).toEqual(expectedResult);

          expect(mock_get).toHaveBeenCalledTimes(1);
          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith(namespace);
          expect((mockClient.api.v1.namespace as any).secret).toHaveBeenCalledWith(secretName);
          expect(mock_put).toHaveBeenCalledWith(secretBody);
        });

        describe('and when namespace not provided', () => {
          test('then default the namespace to `default`', async () => {
            const expectedResult = 'result';

            mock_get.mockResolvedValue('');
            mock_put.mockResolvedValue({body: expectedResult});

            const actualResult = await classUnderTest.create(secretName, secretBody);

            expect(actualResult).toEqual(expectedResult);

            expect(mock_get).toHaveBeenCalledTimes(1);
            expect(mockClient.api.v1.namespace).toHaveBeenCalledWith('default');
            expect((mockClient.api.v1.namespace as any).secret).toHaveBeenCalledWith(secretName);
            expect(mock_put).toHaveBeenCalledWith(secretBody);
          });
        });
      });

      describe('when secret does not exist', () => {
        test('create secret with post()', async () => {
          const expectedResult = 'result';

          mock_get.mockRejectedValue(new Error('value does not exist'));
          mock_post.mockResolvedValue({body: expectedResult});

          const actualResult = await classUnderTest.create(secretName, secretBody, namespace);

          expect(actualResult).toEqual(expectedResult);

          expect(mock_get).toHaveBeenCalledTimes(1);
          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith(namespace);
          expect((mockClient.api.v1.namespace as any).secret).toHaveBeenCalledWith(secretName);
          expect(mock_post).toHaveBeenCalledWith(secretBody);
        });
      });
    });

    describe('given get()', () => {
      const namespace = 'namespace';
      const secretName = 'my-secret';
      const secretBody = {body: {metadata: {name: secretName}}};

      let mock_get: Mock;
      let mock_put: Mock;
      let mock_post: Mock;

      beforeEach(() => {
        mock_get = (mockClient.api.v1.namespaces as any).secrets.get;
        mock_put = (mockClient.api.v1.namespaces as any).secrets.put;
        mock_post = (mockClient.api.v1.namespaces as any).secrets.post;
      });

      describe('when resource exists', () => {
        const resourceName = 'name';
        const resource = {metadata: {name: resourceName}};

        beforeEach(() => {
          mock_get.mockResolvedValue({body: resource});
        });

        test('then return resource value for provided namespace', async () => {
          const namespace = 'ns';
          expect(await classUnderTest.get(resourceName, namespace)).toEqual(resource);

          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith(namespace);
          expect((mockClient.api.v1.namespace as any).secrets).toHaveBeenCalledWith(resourceName);
        });

        test('then return resource value for `default` namespace when none provided', async () => {
          expect(await classUnderTest.get(resourceName)).toEqual(resource);

          expect(mockClient.api.v1.namespace).toHaveBeenCalledWith('default');
          expect((mockClient.api.v1.namespace as any).secrets).toHaveBeenCalledWith(resourceName);
        });
      });

      describe('when resource does not exist', () => {
        const resourceName = 'name';
        const errorMessage = 'resource does not exist';

        beforeEach(() => {
          mock_get.mockRejectedValue(new Error(errorMessage));
        });

        test('then throw error', async () => {
          return classUnderTest.get(resourceName)
            .then(result => fail('should throw error'))
            .catch(err => {
              expect(err.message).toEqual(errorMessage);

              expect(mockClient.api.v1.namespace).toHaveBeenCalledWith('default');
              expect((mockClient.api.v1.namespace as any).secrets).toHaveBeenCalledWith(resourceName);
            });
        });
      });

      describe('when result is undefined', () => {
        const resourceName = 'name';

        beforeEach(() => {
          mock_get.mockResolvedValue(undefined);
        });

        test('then return undefined', async () => {
          expect(await classUnderTest.get(resourceName)).toBeUndefined();
        });
      });
    });

    describe('given copy()', () => {
      let mock_get: Mock;
      let unset_get: () => void;
      let mock_create: Mock;
      let unset_create;
      let mock_updateWithNamespace: Mock;
      beforeEach(() => {
        mock_get = jest.fn();
        unset_get = mockField(classUnderTest, 'get', mock_get);

        mock_create = jest.fn();
        unset_create = mockField(classUnderTest, 'create', mock_create);

        mock_updateWithNamespace = jest.fn();
      });

      afterEach(() => {
        unset_get();
        unset_create();
      });

      test('should call get() with provided options', async () => {
        const resourceName = 'resourceName';
        const fromNamespace = 'fromNamespace';
        const toNamespace = 'toNamespace';
        await classUnderTest.copy(resourceName, fromNamespace, toNamespace);

        expect(mock_get).toBeCalledWith(resourceName, fromNamespace);
      });

      test('should call create() for resource returned', async () => {
        const resourceName = 'resourceName';
        const fromNamespace = 'fromNamespace';
        const toNamespace = 'toNamespace';
        const resource = {metadata: {name: resourceName}};

        mock_get.mockResolvedValue(resource);

        await classUnderTest.copy(resourceName, fromNamespace, toNamespace);

        expect(mock_get).toBeCalledWith(resourceName, fromNamespace);
        expect(mock_create).toHaveBeenCalledTimes(1);
        expect(mock_create).toHaveBeenCalledWith(
          resourceName,
          {
            body: Object.assign(
              {},
              resource,
              {
                metadata: {
                  name: resource.metadata.name,
                  namespace: toNamespace
                }
              }
            )
          },
          toNamespace,
        );
      });
    });
  });
});

function mockField<T>(obj: T, field: keyof T, mock: Mock): () => void {
  const oldValue = obj[field];
  obj[field] = mock as any;

  return () => {
    obj[field] = oldValue;
  }
}
