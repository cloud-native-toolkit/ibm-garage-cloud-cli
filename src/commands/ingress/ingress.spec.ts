import rewire = require('rewire');
import {buildMockKubeClient} from '../../api/kubectl/testHelper';

const module = rewire('./ingress');

const getHostsFromIngress = module.__get__('getHostsFromIngress');

describe('ingress', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getIngressHosts()', () => {

    let mock_getAllIngressHosts;
    let unset_getAllIngressHosts;


    beforeEach(() => {
      mock_getAllIngressHosts = jest.fn();
      unset_getAllIngressHosts = module.__set__('getAllIngressHosts', mock_getAllIngressHosts);

    });

    afterEach(() => {
      unset_getAllIngressHosts();
    });

    describe('when called', () => {
      const hosts = {items: ['jenkins']};
      const namespace = "dev";
 
      beforeEach(() => {
        mock_getAllIngressHosts.mockResolvedValue(hosts);
      });

      test('returns values from getAllIngressHosts', async () => {
        expect(await getHostsFromIngress(namespace)).toEqual(hosts);
        expect(mock_getAllIngressHosts.mock.calls[0][0]).toEqual(namespace);
      });

    });
  });

  
});
