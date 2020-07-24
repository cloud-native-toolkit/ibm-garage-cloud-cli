import {findMatchingVersion, findUnionOfMatchers, IncompatibleVersions, parseVersionMatcher} from './index';
import {VersionComparison, VersionMatcher} from '../../model/version-matcher';
import {ModuleVersionNotFound} from '../../services/iteration-zero-config';

describe('version-resolver', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given parseVersionMatcher()', () => {
    describe('when `1.0.0`', () => {
      test('then return version equals', async () => {
        const version = '1.0.0';

        expect(parseVersionMatcher(version))
          .toEqual([{version, comparator: VersionComparison.eq}]);
      });
    });
    describe('when `> 1.0.0`', () => {
      test('then return version gt', async () => {
        const version = '1.0.0';
        expect(parseVersionMatcher(`> ${version}`))
          .toEqual([{version, comparator: VersionComparison.gt}])
      });
    });
    describe('when `>= 1.0.0`', () => {
      test('then return version gte', async () => {
        const version = '1.0.0';
        expect(parseVersionMatcher(`>= ${version}`))
          .toEqual([{version, comparator: VersionComparison.gte}])
      });
    });
    describe('when `^1.0.0`', () => {
      test('then return version major', async () => {
        const version = '1.0.0';
        expect(parseVersionMatcher(`^${version}`))
          .toEqual([{version, comparator: VersionComparison.major}])
      });
    });
    describe('when `1.0.0 - 1.2.0`', () => {
      test('then return version range', async () => {
        const firstVersion = '1.0.0';
        const secondVersion = '1.2.0';
        expect(parseVersionMatcher(`${firstVersion} - ${secondVersion}`))
          .toEqual([
            {version: firstVersion, comparator: VersionComparison.gte},
            {version: secondVersion, comparator: VersionComparison.lte},
          ])
      });
    });
  });

  describe('given findUnionOfMatchers()', () => {
    describe('when the base matcher is empty', () => {
      test('then return the new matcher', async () => {
        const expectedResult = [{version: '1.0.0', comparator: VersionComparison.eq}];

        expect(findUnionOfMatchers([], expectedResult)).toEqual(expectedResult)
      });
    });

    describe('when two versions are greater than', () => {
      test('then take the higher version', async () => {
        const expectedResult = [{version: '1.2.0', comparator: VersionComparison.gt}];

        expect(findUnionOfMatchers(expectedResult, [{version: '1.0.0', comparator: VersionComparison.gt}]))
          .toEqual(expectedResult);
      });
    });

    describe('when two versions are less than', () => {
      test('then take the lower version', async () => {
        const expectedResult = [{version: '1.0.0', comparator: VersionComparison.lt}];

        expect(findUnionOfMatchers(expectedResult, [{version: '1.2.0', comparator: VersionComparison.lt}]))
          .toEqual(expectedResult);
      });
    });

    describe('when a version contains an equal comparator', () => {
      describe('and when the other versions ranges include that version', () => {
        test('then return the equal version', async () => {
          const expectedResult = [{version: '1.1.0', comparator: VersionComparison.eq}];

          expect(findUnionOfMatchers(expectedResult, [{version: '1.0.0', comparator: VersionComparison.gt}]))
            .toEqual(expectedResult);
        });
      });

      describe('and when the other version ranges do no include that version', () => {
        test('then throw an error', async () => {
          const base = [{version: '1.0.0', comparator: VersionComparison.eq}];
          const other = [{version: '1.1.0', comparator: VersionComparison.gt}];

          expect(() => {
            findUnionOfMatchers(base, other);
          }).toThrow(new IncompatibleVersions([].concat(base).concat(other)));
        });
      });
    });

    describe('when two equal operators are provided', () => {
      describe('and when they have different values', () => {
        test('then throw an error', async () => {
          const base = [{version: '1.0.0', comparator: VersionComparison.eq}];
          const other = [{version: '1.1.0', comparator: VersionComparison.eq}];

          expect(() => {
            findUnionOfMatchers(base, other);
          }).toThrow(new IncompatibleVersions([].concat(base).concat(other)));
        });
      });

      describe('and when they have the same value', () => {
        test('then return the value', async () => {
          const base = [{version: '1.0.0', comparator: VersionComparison.eq}];
          const other = [{version: '1.0.0', comparator: VersionComparison.eq}];

          expect(findUnionOfMatchers(base, other)).toEqual(base);
        });
      });
    });
  });

  describe('given findMatchingVersions()', () => {
    describe('when multiple versions match', () => {
      test('then return the latest version', async () => {
        const expectedResult = {version: '1.5.0'};
        const versions = [
          {version: '1.2.0'},
          expectedResult,
          {version: '1.4.0'},
          {version: '1.3.0'},
        ];
        const module = {id: 'source', versions: versions};

        const matchers: VersionMatcher[] = [
          {
            version: '1.3.0',
            comparator: VersionComparison.gt
          }
        ];

        expect(findMatchingVersion(module, matchers))
          .toEqual(expectedResult);
      });
    });

    describe('when matcher is a range', () => {
      test('then return the latest matching version', async () => {
        const expectedResult = {version: '1.5.0'};
        const versions = [
          {version: '1.6.0'},
          {version: '1.2.0'},
          expectedResult,
          {version: '1.4.0'},
          {version: '1.3.0'},
        ];
        const module = {id: 'source', versions: versions};

        const matchers: VersionMatcher[] = [
          {
            version: '1.3.0',
            comparator: VersionComparison.gt
          },
          {
            version: '1.5.0',
            comparator: VersionComparison.lte
          },
        ];

        expect(findMatchingVersion(module, matchers))
          .toEqual(expectedResult);
      });
    });

    describe('when no versions match', () => {
      test('then throw an exception', async () => {
        const expectedResult = {version: '1.5.0'};
        const versions = [
          {version: '1.2.0'},
          expectedResult,
          {version: '1.4.0'},
          {version: '1.3.0'},
        ];
        const module = {id: 'source', versions: versions};

        const matchers: VersionMatcher[] = [
          {
            version: '1.5.0',
            comparator: VersionComparison.gt
          }
        ];

        expect(() => {
          findMatchingVersion(module, matchers);
        }).toThrow(new ModuleVersionNotFound(module, matchers))
      });
    });
  });
});