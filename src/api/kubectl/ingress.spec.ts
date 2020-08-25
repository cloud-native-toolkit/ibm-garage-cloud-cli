import {mockKubeClientFactory} from './testHelper';
import {Ingress, KubeIngress} from './ingress';
import {Container} from 'typescript-ioc';
import {KubeClient} from './client';
import {setField} from '../../testHelper';
import Mock = jest.Mock;

describe('ingress', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeIngress', () => {
    let classUnderTest: KubeIngress;

    beforeEach(() => {
      Container
        .bind(KubeClient)
        .factory(mockKubeClientFactory);

      classUnderTest = Container.get(KubeIngress);
    });

    describe('given getHosts()', () => {
      let mock_get: Mock;
      let unset_get: () => void;

      beforeEach(() => {
        mock_get = jest.fn();
        unset_get = setField(classUnderTest, 'get', mock_get);
      });

      afterEach(() => {
        unset_get();
      });

      describe('when the ingress exists', () => {

        describe('when single host defined on ingress', () => {
          const host = 'my-host';

          beforeEach(() => {
            mock_get.mockResolvedValue({
                spec: {
                  rules: [{
                    host
                  }]
                }
            });
          });

          test('retrieve host name', async () => {
            const namespace = 'namespace';
            const ingressName = 'ingressName';

            const actualHosts = await classUnderTest.getHosts(namespace, ingressName);

            expect(actualHosts).toEqual([host]);
            expect(mock_get).toBeCalledWith(ingressName, namespace);
          });
        });

        describe('when multiple hosts defined on ingress', () => {
          const hosts = ['my-host', 'my-host2'];

          beforeEach(() => {
            mock_get.mockResolvedValue({
              spec: {
                rules: [{
                  host: hosts[0]
                }, {
                  host: hosts[1]
                }]
              }
            });
          });

          test('retrieve host name', async () => {
            const namespace = 'namespace';
            const ingressName = 'ingressName';

            const actualHosts = await classUnderTest.getHosts(namespace, ingressName);

            expect(actualHosts).toEqual(hosts);
          });
        });

        describe('when no hosts defined on ingress', () => {
          test('throw "no hosts found" error', () => {
            mock_get.mockResolvedValue({
              spec: {
                rules: [{}, {}]
              }
            });

            return classUnderTest.getHosts('name', 'ingress')
              .then(() => fail('should throw error'))
              .catch(err => {
                expect(err.message).toEqual('no hosts found');
              });
          });
        });

        describe('when no rules defined on ingress', () => {
          test('throw "no hosts found" error', () => {
            mock_get.mockResolvedValue({
              spec: {}
            });

            return classUnderTest.getHosts('name', 'ingress')
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
          return classUnderTest.getHosts(namespace, ingressName)
            .then(() => fail('should throw error'))
            .catch(err => {

              expect(err.message).toEqual(`ingresses "${ingressName}" not found`);

              expect(mock_get).toBeCalledWith(ingressName, namespace);
            });
        });
      });
    });

    describe('given getUrls()', () => {
      let mock_get: Mock;
      let unset_get: () => void;
      beforeEach(() => {
        mock_get = jest.fn();
        unset_get = setField(classUnderTest, 'get', mock_get);
      });
      afterEach(() => {
        unset_get();
      });

      describe('when ingress has only tls section', () => {
        const host1 = 'host1';
        const host2 = 'host2';
        const ingress: Ingress = {
          spec: {
            tls: [{
              hosts: [host1, host2],
              secretName: 'secret-name',
            }]
          },
          status: '',
          metadata: {
            name: 'name'
          }
        };
        beforeEach(() => {
          mock_get.mockResolvedValue(ingress);
        });

        test('then return https://{host}', async () => {
          expect(await classUnderTest.getUrls('namespace', 'ingress'))
            .toEqual([`https://${host1}`, `https://${host2}`]);
        });
      });

      describe('when ingress has only rules section', () => {
        const host = 'host1';
        const ingress: Ingress = {
          spec: {
            rules: [{
              host,
              http: {} as any,
            }],
          },
          status: '',
          metadata: {
            name: 'name'
          }
        };
        beforeEach(() => {
          mock_get.mockResolvedValue(ingress);
        });

        test('then return http://{host}', async () => {
          expect(await classUnderTest.getUrls('namespace', 'ingress'))
            .toEqual([`http://${host}`]);
        });
      });

      describe('when ingress has tls and rules section', () => {
        const host = 'host1';
        const ingress: Ingress = {
          spec: {
            tls: [{
              hosts: [host],
              secretName: 'secret-name',
            }],
            rules: [{
              host,
              http: {} as any,
            }],
          },
          status: '',
          metadata: {
            name: 'name'
          }
        };
        beforeEach(() => {
          mock_get.mockResolvedValue(ingress);
        });

        test('then return http://{host}', async () => {
          expect(await classUnderTest.getUrls('namespace', 'ingress'))
            .toEqual([`https://${host}`, `http://${host}`]);
        });
      });
    });
  });
});
