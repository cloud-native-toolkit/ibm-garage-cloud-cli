import rewire = require('rewire');

const zones = rewire('./zones');

const filterZonesForRegion = zones.__get__('filterZonesForRegion');
const getZonePrefix = zones.__get__('getZonePrefix');
const getZones = zones.__get__('getZones');

describe('ibmcloud-zones', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getZones()', () => {
    let mock_execPromise;
    let unset_execPromise;

    let mock_filterZonesForRegion;
    let unset_filterZonesForRegion;

    beforeEach(() => {
      mock_execPromise = jest.fn();
      unset_execPromise = zones.__set__('execPromise', mock_execPromise);

      mock_filterZonesForRegion = jest.fn();
      unset_filterZonesForRegion = zones.__set__('filterZonesForRegion', mock_filterZonesForRegion);
    });

    afterEach(() => {
      unset_execPromise();
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

        const actualResult = await getZones(region);

        expect(actualResult).toEqual(zones);
        expect(mock_execPromise.mock.calls[0][0]).toEqual('ibmcloud ks zones --region-only');
        expect(mock_filterZonesForRegion.mock.calls[0][0]).toEqual(region);
      });
    });
  });

  describe('given filterZonesForRegion()', () => {
    const zones = ['dal10', 'wdc11'];

    describe('when region is "us-south"', () => {
      test('then return a list with a single item', () => {
        expect(zones.filter(filterZonesForRegion('us-south')).length).toEqual(1);
      });

      test('then return values that start with "dal"', () => {
        expect(zones.filter(filterZonesForRegion('us-south'))[0]).toEqual('dal10');
      });
    });

    describe('when region is "us-east"', () => {
      test('then return a list with a single item', () => {
        expect(zones.filter(filterZonesForRegion('us-east')).length).toEqual(1);
      });

      test('then return values that start with "wdc"', () => {
        expect(zones.filter(filterZonesForRegion('us-east'))[0]).toEqual('wdc11');
      });
    });

    describe('when region is undefined', () => {
      test('then return all items', () => {
        expect(zones.filter(filterZonesForRegion()).length).toEqual(zones.length);
      });
    });
  });

  describe('given getZonePrefix()', () => {
    test('when region is "us-south" then return "dal"', () => {
      expect(getZonePrefix('us-south')).toEqual('dal');
    });
    test('when region is "us-east" then return "dal"', () => {
      expect(getZonePrefix('us-east')).toEqual('wdc');
    });
    test('when region is "au-syd" then return "syd"', () => {
      expect(getZonePrefix('au-syd')).toEqual('syd');
    });
    test('when region is "jp-tok" then return "tok"', () => {
      expect(getZonePrefix('jp-tok')).toEqual('tok');
    });
    test('when region is "eu-de" then return "fra"', () => {
      expect(getZonePrefix('eu-de')).toEqual('fra');
    });
    test('when region is "eu-gb" then return "lon"', () => {
      expect(getZonePrefix('eu-gb')).toEqual('lon');
    });
  });
});
