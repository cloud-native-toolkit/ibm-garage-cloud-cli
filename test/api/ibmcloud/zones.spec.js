const getZonePrefix = require('../../../dist/api/ibmcloud/zones').getZonePrefix;
const filterZones = require('../../../dist/api/ibmcloud/zones').filterZones;

describe('ibmcloud-zones', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
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

  describe('given filterZones()', () => {
    const zones = ['dal10', 'wdc11'];

    describe('when region is "us-south"', () => {
      test('then return a list with a single item', () => {
        expect(zones.filter(filterZones('us-south')).length).toEqual(1);
      });

      test('then return values that start with "dal"', () => {
        expect(zones.filter(filterZones('us-south'))[0]).toEqual('dal10');
      });
    });

    describe('when region is "us-east"', () => {
      test('then return a list with a single item', () => {
        expect(zones.filter(filterZones('us-east')).length).toEqual(1);
      });

      test('then return values that start with "wdc"', () => {
        expect(zones.filter(filterZones('us-east'))[0]).toEqual('wdc11');
      });
    });

    describe('when region is undefined', () => {
      test('then return all items', () => {
        expect(zones.filter(filterZones()).length).toEqual(zones.length);
      });
    });
  });
});
