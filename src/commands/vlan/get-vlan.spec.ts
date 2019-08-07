import rewire = require('rewire');
import {FlattenedVlans, TargetInfo} from './get-vlan';
import {IBMCloudVlan} from '../../api/ibmcloud/vlans';

const module = rewire('./get-vlan');

const getVlan = module.__get__('getVlan');
const flattenVlans = module.__get__('flattenVlans');

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

  describe('flattenVlans()', () => {
    test('when vlans array is undefined return empty object', () => {
      expect(flattenVlans(undefined)).toEqual({});
    });

    test('when vlans array is empty return empty object', () => {
      expect(flattenVlans([])).toEqual({});
    });

    test('when vlan with type=public provided return object with public_... values', () => {
      const id = 'id';
      const num = 1;
      const router = 'router';
      const vlans: IBMCloudVlan[] = [{type: 'public', id, num, router}];

      expect(flattenVlans(vlans)).toEqual({public_vlan_id: id, public_vlan_number: num, public_vlan_router_hostname: router});
    });

    test('when vlan with type=private provided return object with public_... values', () => {
      const id = 'id';
      const num = 1;
      const router = 'router';
      const vlans: IBMCloudVlan[] = [{type: 'private', id, num, router}];

      expect(flattenVlans(vlans)).toEqual({private_vlan_id: id, private_vlan_number: num, private_vlan_router_hostname: router});
    });

    test('when vlan with type=bogus provided return empty object', () => {
      const id = 'id';
      const num = 1;
      const router = 'router';
      const vlans: IBMCloudVlan[] = [{type: 'bogus' as 'private', id, num, router}];

      expect(flattenVlans(vlans)).toEqual({});
    });

    test('when vlan with public and private types provided return both', () => {
      const public_vlan_id = 'public_id';
      const public_vlan_number = 1;
      const public_vlan_router_hostname = 'public_router';
      const private_vlan_id = 'private_id';
      const private_vlan_number = 2;
      const private_vlan_router_hostname = 'private_router';
      const vlans: IBMCloudVlan[] = [
        {
          type: 'public',
          id: public_vlan_id,
          num: public_vlan_number,
          router: public_vlan_router_hostname
        },
        {
          type: 'private',
          id: private_vlan_id,
          num: private_vlan_number,
          router: private_vlan_router_hostname
        }
      ];

      expect(flattenVlans(vlans)).toEqual({
        public_vlan_id,
        public_vlan_number,
        public_vlan_router_hostname,
        private_vlan_id,
        private_vlan_number,
        private_vlan_router_hostname
      });
    });
  });
});
