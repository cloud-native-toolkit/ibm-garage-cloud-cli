import {Container} from 'typescript-ioc';
import {Zones} from './zones';
import {ZonesImpl} from './zones.impl';
import {ChildProcess} from '../../util/child-process';
import {factoryFromValue, setField} from '../../testHelper';

describe('ibmcloud-zones', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given Zones', () => {
    let classUnderTest: ZonesImpl;

    let mock_execPromise;

    beforeEach(() => {
      mock_execPromise = jest.fn();
      Container.bind(ChildProcess).factory(factoryFromValue({exec: mock_execPromise}));

      classUnderTest = Container.get(Zones) as ZonesImpl;
    });

    describe('given getZones()', () => {

      let mock_filterZonesForRegion;
      let unset_filterZonesForRegion;

      beforeEach(() => {
        mock_filterZonesForRegion = jest.fn();
        unset_filterZonesForRegion = setField(classUnderTest, 'filterZonesForRegion', mock_filterZonesForRegion);
      });

      afterEach(() => {
        unset_filterZonesForRegion();
      });

      describe('when call succeeds', () => {
        const zones = ['line 1', 'line 2'];

        const execResult = {stdout: zones.join('\n'), stderr: 'error'};

        beforeEach(() => {
          mock_execPromise.mockReturnValue(Promise.resolve(execResult));

          mock_filterZonesForRegion.mockReturnValue((zone: string) => true);
        });

        test('should filter results', async () => {
          const region = 'us-south';

          const actualResult = await classUnderTest.getZones(region);

          expect(actualResult).toEqual(zones);
          expect(mock_execPromise).toHaveBeenCalledWith('ibmcloud ks zones --region-only --provider classic', {env: process.env});
          expect(mock_filterZonesForRegion).toHaveBeenCalledWith(region);
        });
      });
    });

    describe('given filterZonesForRegion()', () => {
      const zones = ['dal10', 'wdc11'];

      describe('when region is "us-south"', () => {
        test('then return a list with a single item', () => {
          expect(zones.filter(classUnderTest.filterZonesForRegion('us-south')).length).toEqual(1);
        });

        test('then return values that start with "dal"', () => {
          expect(zones.filter(classUnderTest.filterZonesForRegion('us-south'))[0]).toEqual('dal10');
        });
      });

      describe('when region is "us-east"', () => {
        test('then return a list with a single item', () => {
          expect(zones.filter(classUnderTest.filterZonesForRegion('us-east')).length).toEqual(1);
        });

        test('then return values that start with "wdc"', () => {
          expect(zones.filter(classUnderTest.filterZonesForRegion('us-east'))[0]).toEqual('wdc11');
        });
      });

      describe('when region is undefined', () => {
        test('then return all items', () => {
          expect(zones.filter(classUnderTest.filterZonesForRegion()).length).toEqual(zones.length);
        });
      });
    });

    describe('given getZonePrefix()', () => {
      test('when region is "us-south" then return "dal"', () => {
        expect(classUnderTest.getZonePrefix('us-south')).toEqual('dal');
      });
      test('when region is "us-east" then return "dal"', () => {
        expect(classUnderTest.getZonePrefix('us-east')).toEqual('wdc');
      });
      test('when region is "au-syd" then return "syd"', () => {
        expect(classUnderTest.getZonePrefix('au-syd')).toEqual('syd');
      });
      test('when region is "jp-tok" then return "tok"', () => {
        expect(classUnderTest.getZonePrefix('jp-tok')).toEqual('tok');
      });
      test('when region is "eu-de" then return "fra"', () => {
        expect(classUnderTest.getZonePrefix('eu-de')).toEqual('fra');
      });
      test('when region is "eu-gb" then return "lon"', () => {
        expect(classUnderTest.getZonePrefix('eu-gb')).toEqual('lon');
      });
    });
  });
});
