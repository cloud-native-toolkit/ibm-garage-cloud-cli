import rewire = require('rewire');
import {buildMockKubeClient} from './testHelper';

const module = rewire('./ingress');

const getIngressHosts = module.__get__('getIngressHosts');

describe('ingress', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('getIngressHosts()', () => {
    let mock_client;
    let unset_buildKubeClient;

    let mock_get;

    beforeEach(() => {
      mock_client = buildMockKubeClient();

      unset_buildKubeClient = module.__set__('buildKubeClient', () => mock_client);

      mock_get = mock_client.apis.extension.v1beta1.namespace().ingress().get;
    });

    afterEach(() => {
      unset_buildKubeClient();
    });

    describe('when the ingress exists', () => {

      describe('when single host defined on ingress', () => {
        const host = 'my-host';

        beforeEach(() => {
          mock_get.mockResolvedValue({
            body: {
              spec: {
                rules: [{
                  host
                }]
              }
            }
          });
        });

        test('retrieve host name', async () => {
          const namespace = 'namespace';
          const ingressName = 'ingressName';

          const actualHosts = await getIngressHosts(namespace, ingressName);

          expect(actualHosts).toEqual([host]);
          expect(mock_client._state.namespace).toEqual(namespace);
          expect(mock_client._state.ingress).toEqual(ingressName);
        });
      });

      describe('when multiple hosts defined on ingress', () => {
        const hosts = ['my-host', 'my-host2'];

        beforeEach(() => {
          mock_get.mockResolvedValue({
            body: {
              spec: {
                rules: [{
                  host: hosts[0]
                }, {
                  host: hosts[1]
                }]
              }
            }
          });
        });

        test('retrieve host name', async () => {
          const namespace = 'namespace';
          const ingressName = 'ingressName';

          const actualHosts = await getIngressHosts(namespace, ingressName);

          expect(actualHosts).toEqual(hosts);
        });
      });

      describe('when no hosts defined on ingress', () => {
        test('throw "no hosts found" error', () => {
          mock_get.mockResolvedValue({
            body: {
              spec: {
                rules: [{}, {}]
              }
            }
          });

          return getIngressHosts('name', 'ingress')
            .then(() => fail('should throw error'))
            .catch(err => {
              expect(err.message).toEqual('no hosts found');
            });
        });
      });

      describe('when no rules defined on ingress', () => {
        test('throw "no hosts found" error', () => {
          mock_get.mockResolvedValue({
            body: {
              spec: {}
            }
          });

          return getIngressHosts('name', 'ingress')
            .then(() => fail('should throw error'))
            .catch(err => {
              expect(err.message).toEqual('no hosts found');
            });
        });
      });
    });

    describe('when the ingress does not exist', () => {
      const ingressName = 'test-ingress';
      const namespace = 'ns';

      beforeEach(() => {
        mock_get.mockReturnValue(Promise.reject(new Error(`ingresses "${ingressName}" not found`)));
      });

      test('throw ingress not found error', async () => {
        return getIngressHosts(namespace, ingressName)
          .then(() => fail('should throw error'))
          .catch(err => {

            expect(err.message).toEqual(`ingresses "${ingressName}" not found`);

            expect(mock_client._state.namespace).toEqual(namespace);
            expect(mock_client._state.ingress).toEqual(ingressName);
          });
      });
    });
  });
});
