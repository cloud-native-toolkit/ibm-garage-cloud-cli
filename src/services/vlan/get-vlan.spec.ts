import {Container} from 'typescript-ioc';
import {TargetInfo} from './get-vlan.api';
import {GetVlanImpl} from './get-vlan';
import {IBMCloudVlan, Vlans, Zones} from '../../api/ibmcloud';
import {factoryFromValue, setField} from '../../testHelper';
import Mock = jest.Mock;

describe.skip('get-vlan', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GetVlan', () => {
    let classUnderTest: GetVlanImpl;

    let mock_getZones: Mock;
    let mock_getVlans: Mock;

    beforeEach(() => {
      mock_getZones = jest.fn();
      Container.bind(Zones).factory(factoryFromValue({getZones: mock_getZones}));

      mock_getVlans = jest.fn();
      Container.bind(Vlans).factory(factoryFromValue({getVlans: mock_getVlans}));

      classUnderTest = Container.get(GetVlanImpl);
    });

    test('classUnderTest should be defined', () => {
      expect(classUnderTest).not.toBeUndefined();
    });

    describe('getVlan()', () => {

      let mock_collectValuesFromTarget;
      let unset_collectValuesFromTarget;

      let mock_getVlanDatacenters;
      let unset_getVlanDatacenters;

      let mock_getFlattenedVlans;
      let unset_getFlattenedVlans;

      beforeEach(() => {
        mock_collectValuesFromTarget = jest.fn();
        mock_getVlanDatacenters = jest.fn();
        mock_getFlattenedVlans = jest.fn();

        unset_collectValuesFromTarget = setField(classUnderTest, 'collectValuesFromTarget', mock_collectValuesFromTarget);
        unset_getVlanDatacenters = setField(classUnderTest, 'getVlanDataCenters', mock_getVlanDatacenters);
        unset_getFlattenedVlans = setField(classUnderTest, 'flattenVlans', mock_getFlattenedVlans);
      });

      afterEach(() => {
        unset_getFlattenedVlans();
        unset_getVlanDatacenters();
        unset_collectValuesFromTarget();
      });

      test('should return result', async () => {
        const options = {};

        const targetInfo: TargetInfo = {vlan_region: 'region', resource_group_name: 'rg', cluster_name: 'cluster'};
        mock_collectValuesFromTarget.mockResolvedValue(targetInfo);

        const vlan_datacenter = ['vlan'];
        mock_getVlanDatacenters.mockResolvedValue(vlan_datacenter);

        const flattenedVlans = {
          private_vlan_number: '1',
          private_vlan_router_hostname: '2',
          public_vlan_number: '3',
          public_vlan_router_hostname: '4'
        };
        mock_getFlattenedVlans.mockResolvedValue(flattenedVlans);

        const actualResult = await classUnderTest.getVlan(options);

        expect(actualResult).toEqual(
          Object.assign(
            {vlan_datacenter},
            flattenedVlans,
            targetInfo,
          ));
        expect(mock_collectValuesFromTarget.mock.calls[0][0]).toBe(options);
        expect(mock_getVlanDatacenters.mock.calls[0][0]).toEqual(targetInfo.vlan_region);
        expect(mock_getFlattenedVlans.mock.calls[0][0]).toEqual(vlan_datacenter);
      });
    });

    describe('flattenVlans()', () => {
      test('when vlans array is undefined return empty object', () => {
        expect(classUnderTest.flattenVlans(undefined)).toEqual({});
      });

      test('when vlans array is empty return empty object', () => {
        expect(classUnderTest.flattenVlans([])).toEqual({});
      });

      test('when vlan with type=public provided return object with public_... values', () => {
        const public_vlan: IBMCloudVlan = {type: 'public', id: 'id', num: 1, router: 'router'};
        const vlans: IBMCloudVlan[] = [public_vlan];

        expect(classUnderTest.flattenVlans(vlans)).toEqual({public: public_vlan});
      });

      test('when vlan with type=private provided return object with public_... values', () => {
        const private_vlan: IBMCloudVlan = {type: 'private', id: 'id', num: 1, router: 'router'};
        const vlans: IBMCloudVlan[] = [private_vlan];

        expect(classUnderTest.flattenVlans(vlans)).toEqual({private: private_vlan});
      });

      test('when vlan with type=bogus provided return empty object', () => {
        const id = 'id';
        const num = 1;
        const router = 'router';
        const vlans: IBMCloudVlan[] = [{type: 'bogus' as 'private', id, num, router}];

        expect(classUnderTest.flattenVlans(vlans)).toEqual({});
      });

      test('when vlan with public and private types provided return both', () => {
        const public_vlan: IBMCloudVlan = {
          type: 'public',
          id: 'public_id',
          num: 1,
          router: 'public_router'
        };
        const private_vlan: IBMCloudVlan = {
          type: 'private',
          id: 'private_id',
          num: 2,
          router: 'private_router'
        };

        const vlans: IBMCloudVlan[] = [
          public_vlan,
          private_vlan,
        ];

        expect(classUnderTest.flattenVlans(vlans)).toEqual({
          public: public_vlan,
          private: private_vlan,
        });
      });
    });
  });
});
