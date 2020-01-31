import {
  AbstractKubernetesResourceManager,
  KubeBody,
  KubeResource,
  KubeResourceList,
  Props
} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {mockField, providerFromValue, setField} from '../../testHelper';
import {Secret} from './secrets';
import {KindClient, KindInstance, KubeKindBuilder} from './kind-builder';
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
      client: Container.get(KubeKindBuilder),
      name: 'secret',
      kind: 'Secret',
    })
  }
};

@Provided(testV1Provider)
class TestV1KubernetesResource extends AbstractKubernetesResourceManager<TestResource> {
}


export const testV1Beta1Provider: Provider = {
  get: () => {
    return new TestV1Beta1KubernetesResource({
      client: Container.get(KubeKindBuilder),
      group: 'extension',
      version: 'v1beta1',
      name: 'ingress',
      kind: 'Ingress',
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
  let kindClient: KindClient<any>;
  let kindInstance: KindInstance<any>;
  let getResourceNode: Mock;
  beforeEach(() => {

    kindInstance = {
      kind: 'test',
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    };

    kindClient = Object.assign(
      jest.fn().mockReturnValue(kindInstance),
      {
        get: jest.fn(),
        post: jest.fn(),
      }
    );

    getResourceNode = jest.fn().mockResolvedValue(kindClient);

    Container.bind(KubeKindBuilder)
      .provider(providerFromValue({
        getResourceNode,
      }));
    classUnderTest = Container.get(TestV1KubernetesResource);
  });

  describe('given TestV1KubernetesResource', () => {
    describe('given constructor', () => {
      test('group should be undefined', () => {
        expect(classUnderTest.group).toBeUndefined();
      });

      test('version should be `v1`', () => {
        expect(classUnderTest.version).toEqual('v1');
      });

      test('kind should be `secret`', () => {
        expect(classUnderTest.name).toEqual('secret');
      });

      test('client should not be undefined', () => {
        expect(classUnderTest.client).not.toBeUndefined();
      });
    });

    describe('given list()', () => {
      let mock_get: Mock;
      beforeEach(() => {
        mock_get = kindClient.get as Mock;
      });

      describe('when namespace not provided', () => {
        test('then query secrets in `default` namespace', async () => {
          expect(classUnderTest.name).toEqual('secret');

          await classUnderTest.list();

          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual('default');
        });
      });

      describe('when namespace is provided', () => {
        test('then query secrets in provided namespace', async () => {
          const expectedResult: Secret[] = [{}, {}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          await classUnderTest.list({namespace});

          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual(namespace);
        });

        test('then return list of secrets', async () => {
          const expectedResult: Secret[] = [{val: '1'}, {val: '2'}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          const actualResult = await classUnderTest.list({namespace});

          expect(mock_get).toHaveBeenCalledTimes(1);
          expect(mock_get).toHaveBeenCalledWith({});
          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when selector is provided', () => {
        test('then filter the results with selector', async () => {
          const expectedResult: Secret[] = [{val: '1'}, {val: '2'}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const namespace = 'ns';
          const labelSelector = 'app=test';
          const actualResult = await classUnderTest.list({namespace, qs: {labelSelector}});

          expect(actualResult).toEqual(expectedResult);
          expect(mock_get).toHaveBeenCalledWith({qs: {labelSelector}});
        });
      });

      describe('when filter is provided', () => {
        test('then apply filter to results', async () => {
          const expectedResult: Secret[] = [{val: '1'}, {val: '2'}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const filter = jest.fn();
          filter.mockReturnValue(true);

          const namespace = 'ns';
          const actualResult = await classUnderTest.list({namespace, filter});

          expect(actualResult).toEqual(expectedResult);
          expect(filter).toHaveBeenCalledTimes(2);
          expect(mock_get).toHaveBeenCalledWith({});
        });
      });

      describe('when map is provided', () => {
        test('then apply map to results', async () => {
          const expectedResult: Secret[] = [{val: '1'}, {val: '2'}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const map = jest.fn();
          map.mockImplementation(val => val);

          const namespace = 'ns';
          const actualResult = await classUnderTest.list({namespace, map});

          expect(actualResult).toEqual(expectedResult);
          expect(map).toHaveBeenCalledTimes(2);
          expect(mock_get).toHaveBeenCalledWith({});
        });
      });

      describe('when filter and map are provided', () => {
        test('then apply filter and map to results', async () => {
          const expectedResult: Secret[] = [{val: '1'}, {val: '2'}] as any;
          const listResult: Partial<KubeResourceList<Secret>> = {items: expectedResult};
          mock_get.mockResolvedValue({body: listResult});

          const filter = jest.fn();
          filter.mockReturnValue(true);

          const map = jest.fn();
          map.mockImplementation(val => val);

          const namespace = 'ns';
          const actualResult = await classUnderTest.list({namespace, filter, map});

          expect(actualResult).toEqual(expectedResult);
          expect(filter).toHaveBeenCalledTimes(2);
          expect(map).toHaveBeenCalledTimes(2);
          expect(mock_get).toHaveBeenCalledWith({});
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
        unset_list = setField(classUnderTest, 'list', mock_list);

        mock_create = jest.fn();
        unset_create = setField(classUnderTest, 'createOrUpdate', mock_create);
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

    describe('given createOrUpdate()', () => {
      const namespace = 'namespace';
      const secretName = 'my-secret';
      const secretBody = {body: {metadata: {name: secretName}}};

      let processedName = 'processedName';
      let processedBody = {value: 'val'};

      let exists: Mock;
      let mock_get: Mock;
      let mock_put: Mock;
      let mock_post: Mock;
      let processName: Mock;
      let processInputs: Mock;

      beforeEach(() => {
        exists = mockField(classUnderTest, 'exists');
        processName = mockField(classUnderTest, 'processName');
        processInputs = mockField(classUnderTest, 'processInputs');

        processName.mockReturnValue(processedName);
        processInputs.mockReturnValue(processedBody);

        mock_get = mockField(classUnderTest, 'get');
        mock_put = kindInstance.put as Mock;
        mock_post = kindClient.post as Mock;
      });

      describe('when secret exists', () => {
        const expectedResult = 'result';
        beforeEach(() => {
          exists.mockResolvedValue(true);

          mock_get.mockResolvedValue(expectedResult);
          mock_put.mockResolvedValue({body: expectedResult});
        });

        test('update secret with put()', async () => {

          const actualResult = await classUnderTest.createOrUpdate(secretName, secretBody, namespace);

          expect(actualResult).toEqual(expectedResult);

          expect(exists).toHaveBeenCalledTimes(1);
          expect(processName).toHaveBeenCalledWith(secretName);
          expect(processInputs).toHaveBeenCalledWith(processedName, secretBody.body, expectedResult);
          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual(namespace);
          expect(kindClient).toHaveBeenCalledWith(processedName);
          expect(mock_put).toHaveBeenCalledWith(processedBody);
        });

        describe('and when namespace not provided', () => {
          test('then default the namespace to `default`', async () => {

            const actualResult = await classUnderTest.createOrUpdate(secretName, secretBody);

            expect(actualResult).toEqual(expectedResult);

            expect(getResourceNode).toHaveBeenCalled();
            expect(getResourceNode.mock.calls[0][3]).toEqual('default');
          });
        });
      });

      describe('when secret does not exist', () => {
        beforeEach(() => {
          exists.mockResolvedValue(false);
        });

        test('create secret with post()', async () => {
          const expectedResult = 'result';

          mock_post.mockResolvedValue({body: expectedResult});

          const actualResult = await classUnderTest.createOrUpdate(secretName, secretBody, namespace);

          expect(actualResult).toEqual(expectedResult);

          expect(processName).toHaveBeenCalledWith(secretName);
          expect(processInputs).toHaveBeenCalledWith(processedName, secretBody.body);
          expect(exists).toHaveBeenCalledTimes(1);
          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual(namespace);
          expect(mock_post).toHaveBeenCalledWith(processedBody);
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
        mock_get = kindInstance.get as Mock;
        mock_put = kindInstance.put as Mock;
        mock_post = kindClient.post as Mock;
      });

      describe('when resource exists', () => {
        const resourceName = 'name';
        const resource = {metadata: {name: resourceName}};

        beforeEach(() => {
          mock_get.mockResolvedValue({body: resource});
        });

        test('then return resource value for provided namespace', async () => {
          const namespace = 'ns';
          const actualResult = await classUnderTest.get(resourceName, namespace);

          expect(actualResult).toEqual(resource);
          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual(namespace);
          expect(kindClient).toHaveBeenCalledWith(resourceName);
        });

        test('then return resource value for `default` namespace when none provided', async () => {
          expect(await classUnderTest.get(resourceName)).toEqual(resource);

          expect(getResourceNode).toHaveBeenCalled();
          expect(getResourceNode.mock.calls[0][3]).toEqual('default');
          expect(kindClient).toHaveBeenCalledWith(resourceName);
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

              expect(getResourceNode).toHaveBeenCalled();
              expect(getResourceNode.mock.calls[0][3]).toEqual('default');
              expect(kindClient).toHaveBeenCalledWith(resourceName);
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
        unset_get = setField(classUnderTest, 'get', mock_get);

        mock_create = jest.fn();
        unset_create = setField(classUnderTest, 'createOrUpdate', mock_create);

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

    describe('given processInputs()', () => {
      describe('when name is valid', () => {
        test('then return same value', async () => {
          const name = 'test-name-valid';
          const body: KubeBody<KubeResource> = {
            body: {
              apiVersion: 'v1',
              kind: 'Secret',
              metadata: {
                name,
                labels: {
                  test: 'value'
                }
              }
            }
          };

          expect(classUnderTest.processInputs(name, body.body))
            .toEqual(body);
        });
      });
    });

    describe('given processName()', () => {
      describe('when name contains an underscore', () => {
        test('then return same value with lower case name', async () => {
          const name = 'test_name_valid';
          const labels = {
            test: 'value'
          };
          const body: KubeBody<KubeResource> = {
            body: {
              metadata: {
                name,
                labels,
              }
            }
          };

          expect(classUnderTest.processName(name))
            .toEqual(name.replace(new RegExp('_', 'g'), '-'));
        });
      });
    });
  });
});

