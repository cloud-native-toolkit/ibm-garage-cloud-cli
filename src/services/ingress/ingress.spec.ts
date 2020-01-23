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

    let mock_getAllUrls: Mock;

    beforeEach(() => {
      mock_getAllUrls = jest.fn();
      Container.bind(KubeIngress).provider(providerFromValue({getAllUrls: mock_getAllUrls}));

      classUnderTest = Container.get(GetIngress);
    });

    describe('given getIngressHosts()', () => {

      describe('when called', () => {
        const hosts = [{name: 'jenkins', urls: ['jenkins', 'jenkins1']}];
        const namespace = "dev";

        beforeEach(() => {
          mock_getAllUrls.mockResolvedValue(hosts);
        });

        test('returns values from ingress.getAllUrls', async () => {
          expect(await classUnderTest.getIngress(namespace)).toEqual([{name: 'jenkins', url: 'jenkins'}]);

          expect(mock_getAllUrls).toHaveBeenCalledWith(namespace);
        });

      });
    });
  });

  
});
