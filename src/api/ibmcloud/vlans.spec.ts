import rewire = require('rewire');
import {IBMCloudVlan} from './vlans';

const vlans = rewire('./vlans');

const getVlans = vlans.__get__('getVlans');
const parseVlan = vlans.__get__('parseVlan');
const parseVlanRow = vlans.__get__('parseVlanRow');

describe('ibmcloud-vlans', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getVlans()', () => {
    let mock_execPromise;
    let unset_execPromise;

    let mock_parseVlan;
    let unset_parseVlan;

    beforeEach(() => {
      mock_execPromise = jest.fn();
      unset_execPromise = vlans.__set__('execPromise', mock_execPromise);

      mock_parseVlan = jest.fn();
      unset_parseVlan = vlans.__set__('parseVlan', mock_parseVlan);
    });

    afterEach(() => {
      unset_execPromise();
      unset_parseVlan();
    });

    describe('when exec call succeeds', () => {
      const zone = 'myzone';
      const promiseResult = {stdout: 'vlan', stderr: 'error'};
      const expectedResult: IBMCloudVlan[] = [
        {type: 'public', num: 1, router: 'router'},
      ];

      beforeEach(() => {
        mock_execPromise.mockReturnValue(Promise.resolve(promiseResult));

        mock_parseVlan.mockReturnValue(expectedResult);
      });

      test('calls exec with ibmcloud command', async () => {

        const actualResult = await getVlans(zone);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_execPromise.mock.calls[0][0]).toEqual(`ibmcloud ks vlans --zone ${zone}`);
        expect(mock_parseVlan.mock.calls[0][0]).toEqual(promiseResult.stdout);
      });
    })
  });

  describe('given parseVlan()', () => {
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

  describe('given parseVlanRow()', () => {
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
});
