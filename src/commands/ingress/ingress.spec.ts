import {GetIngress, GetIngressImpl} from './ingress';
import {Container} from 'typescript-ioc';
import Mock = jest.Mock;
import {KubeIngress} from '../../api/kubectl/ingress';
import {providerFromValue} from '../../testHelper';

describe('ingress', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GetIngress', () => {
    let classUnderTest: GetIngressImpl;

    let mock_getAllIngressHosts: Mock;

    beforeEach(() => {
      mock_getAllIngressHosts = jest.fn();
      Container.bind(KubeIngress).provider(providerFromValue({getAllHosts: mock_getAllIngressHosts}));

      classUnderTest = Container.get(GetIngress);
    });

    describe('given getIngressHosts()', () => {

      describe('when called', () => {
        const hosts = {items: ['jenkins']};
        const namespace = "dev";

        beforeEach(() => {
          mock_getAllIngressHosts.mockResolvedValue(hosts);
        });

        test('returns values from getAllIngressHosts', async () => {
          expect(await classUnderTest.getIngress(namespace)).toEqual(hosts);
          expect(mock_getAllIngressHosts.mock.calls[0][0]).toEqual(namespace);
        });

      });
    });
  });

  
});
