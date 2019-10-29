import {GetVlan, GetVlanImpl, TargetInfo} from './get-vlan';
import {IBMCloudVlan, Vlans} from '../../api/ibmcloud/vlans';
import {Container} from 'typescript-ioc';
import {mockField, providerFromValue} from '../../testHelper';
import {Zones} from '../../api/ibmcloud/zones';
import Mock = jest.Mock;

describe('get-vlan', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GetVlan', () => {
    let classUnderTest: GetVlanImpl;

    let mock_getZones: Mock;
    let mock_getVlans: Mock;

    beforeEach(() => {
      mock_getZones = jest.fn();
      Container.bind(Zones).provider(providerFromValue({getZones: mock_getZones}));

      mock_getVlans = jest.fn();
      Container.bind(Vlans).provider(providerFromValue({getVlans: mock_getVlans}));

      classUnderTest = Container.get(GetVlan);
    });

    test('classUnderTest should be defined', () => {
      expect(classUnderTest).not.toBeUndefined();
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

        unset_collectValuesFromTarget = mockField(classUnderTest, 'collectValuesFromTarget', mock_collectValuesFromTarget);
        unset_getVlanDatacenter = mockField(classUnderTest, 'getVlanDatacenter', mock_getVlanDatacenter);
        unset_getFlattenedVlans = mockField(classUnderTest, 'getFlattenedVlans', mock_getFlattenedVlans);
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
        expect(mock_getVlanDatacenter.mock.calls[0][0]).toEqual(targetInfo.vlan_region);
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
