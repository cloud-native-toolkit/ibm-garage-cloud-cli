import {GetDashboardUrl, GetDashboardUrlImpl} from './get-dashboard-url';
import {Container} from 'typescript-ioc';
import {buildOptionWithEnvDefault} from '../../util/yargs-support';
import Mock = jest.Mock;
import {KubeIngress} from '../../api/kubectl/ingress';
import {providerFromValue} from '../../testHelper';
import {KubeConfigMap} from '../../api/kubectl';

describe('get-dashboard-url', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: GetDashboardUrlImpl;
  let kubeIngress_getUrls: Mock;
  let kubeConfigMap_getData: Mock;
  beforeEach(() => {
    kubeIngress_getUrls = jest.fn();
    Container.bind(KubeIngress).provider(providerFromValue({
      getUrls: kubeIngress_getUrls,
    }));
    kubeIngress_getUrls.mockResolvedValue([]);

    kubeConfigMap_getData = jest.fn();
    Container.bind(KubeConfigMap).provider(providerFromValue({
      getData: kubeConfigMap_getData,
    }));

    classUnderTest = Container.get(GetDashboardUrlImpl);
  });

  describe('given getUrl()', () => {
    describe('when configmap exists', () => {
      test('then should return url from configmap', async () => {
        const expectedUrl = 'expectedUrl';
        kubeConfigMap_getData.mockResolvedValue({DASHBOARD_URL: expectedUrl});

        const namespace = 'ns';
        const actualUrl = await classUnderTest.getUrl(namespace);

        expect(actualUrl).toEqual(expectedUrl);
        expect(kubeConfigMap_getData).toHaveBeenCalledWith('dashboard-config', namespace);
      });
    });

    describe('and when configmap does not exist', () => {
      describe('when ingress exists', () => {
        test('then should return ingress url', async () => {
          const namespace = 'test';
          const expectedUrl = 'expectedUrl';
          kubeIngress_getUrls.mockResolvedValue([expectedUrl]);

          const actualUrl = await classUnderTest.getUrl(namespace);

          expect(actualUrl).toEqual(expectedUrl);
          expect(kubeIngress_getUrls).toHaveBeenCalledWith(namespace, 'catalyst-dashboard');
        });
      });

      describe('when ingress does not exist', () => {
        test('then should throw an error', async () => {
          const message = 'not found';
          kubeIngress_getUrls.mockRejectedValue(new Error(message));

          try {
            await classUnderTest.getUrl('test');
            fail('should throw error');
          } catch (err) {
            expect(err.message).toEqual(message);
          }
        })
      });
    });
  });
});