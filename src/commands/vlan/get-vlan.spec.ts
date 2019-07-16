import rewire = require('rewire');
import {FlattenedVlans, TargetInfo} from './get-vlan';

const module = rewire('./get-vlan');

const getVlan = module.__get__('getVlan');

describe('get-vlan', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('getVlan()', () => {

    let mock_collectValuesFromTarget;
    let unset_collectValuesFromTarget;

    let mock_getVlanDatacenter;
    let unset_getVlanDatacenter;

    let mock_getFlattenedVlans;
    let unset_getFlattenedVlans;

    beforeEach(() => {
      mock_collectValuesFromTarget = jest.fn();
      mock_getVlanDatacenter = jest.fn();
      mock_getFlattenedVlans = jest.fn();

      unset_collectValuesFromTarget = module.__set__('collectValuesFromTarget', mock_collectValuesFromTarget);
      unset_getVlanDatacenter = module.__set__('getVlanDatacenter', mock_getVlanDatacenter);
      unset_getFlattenedVlans = module.__set__('getFlattenedVlans', mock_getFlattenedVlans);
    });

    afterEach(() => {
      unset_getFlattenedVlans();
      unset_getVlanDatacenter();
      unset_collectValuesFromTarget();
    });

    test('should return result', async () => {
      const options = {};


      const targetInfo: TargetInfo = {vlan_region: 'region', resource_group_name: 'rg', cluster_name: 'cluster'};
      mock_collectValuesFromTarget.mockResolvedValue(targetInfo);

      const vlan_datacenter = 'vlan';
      mock_getVlanDatacenter.mockResolvedValue(vlan_datacenter);

      const flattenedVlans: FlattenedVlans = {
        private_vlan_number: '1',
        private_vlan_router_hostname: '2',
        public_vlan_number: '3',
        public_vlan_router_hostname: '4'
      };
      mock_getFlattenedVlans.mockResolvedValue(flattenedVlans);

      const actualResult = await getVlan(options);

      expect(actualResult).toEqual(
        Object.assign(
          {vlan_datacenter},
          flattenedVlans,
          targetInfo,
        ));
      expect(mock_collectValuesFromTarget.mock.calls[0][0]).toBe(options);
      expect(mock_getVlanDatacenter.mock.calls[0][0]).toEqual(targetInfo.vlan_region);
      expect(mock_getFlattenedVlans.mock.calls[0][0]).toEqual(vlan_datacenter);
    });
  });
});
