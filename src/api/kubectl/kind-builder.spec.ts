import {CustomResourceDefinition, DefaultKubeKindBuilder} from './kind-builder';
import {Container} from 'typescript-ioc';
import {AsyncKubeClient, KubeClient} from './client';
import {buildMockKubeClient} from './testHelper';
import {providerFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('kind-builder', () => {
  test('canary validates test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given DefaultKubeKindBuilder', () => {
    let classUnderTest: DefaultKubeKindBuilder;
    let kubeClient: KubeClient;
    beforeEach(() => {
      kubeClient = buildMockKubeClient();
      Container.bind(AsyncKubeClient).provider(providerFromValue(new AsyncKubeClient(kubeClient)));

      classUnderTest = Container.get(DefaultKubeKindBuilder);
    });

    describe('given getResourceNode()', () => {
      describe('when group is undefined',  () => {
        const group = undefined;
        const version = 'v1';
        const kind = 'configmap';
        const namespace = 'ns';

        test('then use `api` root', async () => {
          const result = await classUnderTest.getResourceNode(group, version, kind, namespace);

          expect(kubeClient.api[version].namespace).toHaveBeenCalledWith(namespace);
          expect((kubeClient.api[version].namespace(namespace)[kind])).toEqual(result);
        });
      });

      describe('when group is `extension`',  () => {
        const group = 'extension';
        const version = 'v1beta1';
        const kind = 'ingress';
        const namespace = 'ns';

        test('then use `apis` root', async () => {
          const result = await classUnderTest.getResourceNode(group, version, kind, namespace);

          expect(kubeClient.apis[group][version].namespace).toHaveBeenCalledWith(namespace);
          expect((kubeClient.apis[group][version].namespace(namespace)[kind])).toEqual(result);
        });
      });

      describe('when version path is not found',  () => {
        const group = 'extension';
        const version = 'invalid';
        const kind = 'ingress';
        const namespace = 'ns';

        test('then return undefined', async () => {
          const result = await classUnderTest.getResourceNode(group, version, kind, namespace);

          expect(result).toBeUndefined();
        });
      });
    });

    describe('given registerCrdSchema()', () => {
      describe('when crd is not found', () => {
        test('then return false without calling addCustomResourceDefinition()', async () => {
          const crdName = 'test.crd';
          const result = await classUnderTest.registerCrdSchema(crdName);

          expect(result).toEqual(false);
          expect(kubeClient.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions).toHaveBeenCalledWith(crdName);
          expect(kubeClient.addCustomResourceDefinition).not.toHaveBeenCalled();
        });
      });

      describe('when crd is found', () => {
        const crdName = 'test.crd';
        const crd: CustomResourceDefinition = {
          metadata: {
            name: crdName,
            annotations: {},
          },
          spec: {
            test: 'value',
          }
        };

        beforeEach(() => {
          (kubeClient.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions as any)._instance.get.mockResolvedValue({body: crd});
        });

        test('should call addCustomResourceDefinition() with values from crd', async () => {
          const result = await classUnderTest.registerCrdSchema(crdName);

          expect(result).toEqual(true);
          expect(kubeClient.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions).toHaveBeenCalledWith(crdName);
          expect(kubeClient.addCustomResourceDefinition).toHaveBeenCalledWith(crd);
        });

        describe('and when there is an error during addCustomResourceDefinition()', () => {
          beforeEach(() => {
            (kubeClient.addCustomResourceDefinition as Mock).mockImplementation(() => {
              throw new Error('something bad')
            });
          });

          test('then return false', async () => {
            const result = await classUnderTest.registerCrdSchema(crdName);

            expect(result).toEqual(false);
          });
        });
      });
    });
  });
});