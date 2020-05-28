import {Container} from 'typescript-ioc';
import {GetEndpointsImpl} from './endpoints';
import {KubeIngress, OcpRoute} from '../../api/kubectl';
import {factoryFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('ingress', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GetEndpoints', () => {
    let classUnderTest: GetEndpointsImpl;

    let mock_kubeGetAllUrls: Mock;
    let mock_ocpGetAllUrls: Mock;

    beforeEach(() => {
      mock_kubeGetAllUrls = jest.fn();
      Container.bind(KubeIngress).factory(factoryFromValue({getAllUrls: mock_kubeGetAllUrls}));
      mock_ocpGetAllUrls = jest.fn();
      Container.bind(OcpRoute).factory(factoryFromValue({getAllUrls: mock_ocpGetAllUrls}));

      classUnderTest = Container.get(GetEndpointsImpl);
    });

    describe('given getEndpoints()', () => {

      describe('when called', () => {
        const kubeHosts = [{name: 'jenkins', urls: ['jenkins', 'jenkins1']}];
        const ocpHosts = [{name: 'ocp', urls: ['ocp', 'ocp1']}];
        const namespace = "dev";

        beforeEach(() => {
          mock_kubeGetAllUrls.mockResolvedValue(kubeHosts as any);
          mock_ocpGetAllUrls.mockResolvedValue(ocpHosts as any);
        });

        test('returns values from ingress.getAllUrls', async () => {
          expect(await classUnderTest.getEndpoints(namespace)).toEqual([{name: 'jenkins', url: 'jenkins', source: 'ingress'}, {name: 'ocp', url: 'ocp', source: 'route'}]);

          expect(mock_kubeGetAllUrls).toHaveBeenCalledWith(namespace);
        });

      });
    });
  });

  
});
