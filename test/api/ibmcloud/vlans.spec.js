const parseVlan = require('../../../dist/api/ibmcloud/vlans').parseVlan;
const parseVlanRow = require('../../../dist/api/ibmcloud/vlans').parseVlanRow;

describe('ibmcloud-vlans', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('parseVlanRow()', () => {
    describe('when vlan value is "2558537   rates   2372     private   bcr01a.dal10   true"', () => {
      test('then return {type: "private", num: 2372, router: "bcr01a.dal10"}', () => {
        expect(parseVlanRow('2558537   rates   2372     private   bcr01a.dal10   true'))
          .toEqual({
            type: 'private',
            num: 2372,
            router: 'bcr01a.dal10',
          });
      });
    });

    describe('when vlan value is "2366017           810      private   bcr04a.dal10   true"', () => {
      test('then return {type: "private", num: 810, router: "bcr04a.dal10"}', () => {
        expect(parseVlanRow('2366017           810      private   bcr04a.dal10   true'))
          .toEqual({
            type: 'private',
            num: 810,
            router: 'bcr04a.dal10',
          });
      });
    });

    describe('when vlan value is "2558531   rates   1849     public    fcr01a.dal10   true"', () => {
      test('then return {type: "public", num: 1849, router: "fcr01a.dal10"}', () => {
        expect(parseVlanRow('2558531   rates   1849     public    fcr01a.dal10   true'))
          .toEqual({
            type: 'public',
            num: 1849,
            router: 'fcr01a.dal10',
          });
      });
    });
  });

  describe('parseVlan()', () => {
    describe('when multiple vlan rows provided', () => {
      const rows =
        '2558537   rates   2372     private   bcr01a.dal10   true\n' +
        '2366017           810      private   bcr04a.dal10   true\n' +
        '2558531   rates   1849     public    fcr01a.dal10   true\n' +
        '2366015           800      public    fcr04a.dal10   true';

      test('then return a vlan record for each row', () => {
        const vlan = parseVlan(rows);

        expect(vlan.length).toEqual(4);
      });
    });

    describe('when multiple vlan rows provided with header', () => {
      const rows = 'OK\n' +
        'ID        Name    Number   Type      Router         Supports Virtual Workers\n' +
        '2558537   rates   2372     private   bcr01a.dal10   true\n' +
        '2366017           810      private   bcr04a.dal10   true\n' +
        '2558531   rates   1849     public    fcr01a.dal10   true\n' +
        '2366015           800      public    fcr04a.dal10   true';

      test('then return a vlan record for each row', () => {
        const vlan = parseVlan(rows);

        expect(vlan.length).toEqual(4);
      });
    });
  })
});
