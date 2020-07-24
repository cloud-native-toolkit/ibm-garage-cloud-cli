import {VersionComparison, versionComparisonFromString} from './version-matcher';

describe('version-matcher', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given versionComparisonFromString()', () => {
    describe('when value is invalid', () => {
      test('then return eq', async () => {
        expect(versionComparisonFromString('bogus'))
          .toEqual(VersionComparison.eq);
      });
    });
    describe('when value is `=`', () => {
      test('then return eq', async () => {
        expect(versionComparisonFromString('='))
          .toEqual(VersionComparison.eq);
      });
    });
    describe('when value is `>`', () => {
      test('then return gt', async () => {
        expect(versionComparisonFromString('>'))
          .toEqual(VersionComparison.gt);
      });
    });
    describe('when value is `>=`', () => {
      test('then return gte', async () => {
        expect(versionComparisonFromString('>='))
          .toEqual(VersionComparison.gte);
      });
    });
    describe('when value is `^`', () => {
      test('then return major', async () => {
        expect(versionComparisonFromString('^'))
          .toEqual(VersionComparison.major);
      });
    });
  });
})