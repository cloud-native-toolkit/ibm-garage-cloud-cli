import {VersionComparison, versionComparisonFromString, VersionMatcher} from '../../model/version-matcher';
import * as compareVersions from 'compare-versions';
import {CompareOperator} from 'compare-versions';
import {ModuleVersionNotFound} from '../../services/iteration-zero-config';

export class IncompatibleVersions extends Error {
  constructor(public readonly versions: VersionMatcher[]) {
    super('Versions are incompatible: ' + JSON.stringify(versions));
  }
}

export const parseVersionMatcher = (versionPattern: string | VersionMatcher[]): VersionMatcher[] => {
  if (Array.isArray(versionPattern)) {
    return versionPattern;
  }

  const rangeRegEx = /(\d+[.]\d+[.]\d+) - (\d+[.]\d+[.]\d+)/;
  if (rangeRegEx.test(versionPattern)) {
    const firstVersion = versionPattern.replace(rangeRegEx, '$1');
    const secondVersion = versionPattern.replace(rangeRegEx, '$2');

    return [{
      version: firstVersion,
      comparator: VersionComparison.gte,
    }, {
      version: secondVersion,
      comparator: VersionComparison.lte,
    }];
  }

  const version: string = versionPattern.replace(/.*(\d+[.]\d+[.]\d+)/, '$1');
  const comparator: string = versionPattern.replace(version, '').trim();

  return [{
    version,
    comparator: versionComparisonFromString(comparator),
  }];
}

export function asCompareOperator(comparator: VersionComparison): CompareOperator {
  if (comparator === VersionComparison.major || comparator === VersionComparison.minor) {
    return '>=';
  }

  return comparator;
}

export function findUnionOfMatchers(baseMatchers: VersionMatcher[], newMatchers: VersionMatcher[]): VersionMatcher[] {
  if (!baseMatchers || baseMatchers.length == 0) {
    return newMatchers;
  }

  const results: VersionMatcher[] = [];

  const matchers: VersionMatcher[] = [].concat(baseMatchers).concat(newMatchers);

  const eqMatchers: VersionMatcher[] = matchers
    .filter(m => (m.comparator === VersionComparison.eq))
    .reduce((result: VersionMatcher[], current: VersionMatcher) => {
      if (!result.some(v => v.version === current.version)) {
        result.push(current);
      }

      return result;
    }, []);

  if (eqMatchers.length > 1) {
    throw new IncompatibleVersions(eqMatchers);
  } else if (eqMatchers.length > 0) {
    const matcher = eqMatchers[0];

    const incompatible: VersionMatcher[] = matchers
      .filter(m => (m.comparator !== VersionComparison.eq))
      .filter(m => compareVersions.compare(m.version, matcher.version, asCompareOperator(m.comparator)))

    if (incompatible.length > 0) {
      throw new IncompatibleVersions([].concat(eqMatchers).concat(incompatible));
    }

    return eqMatchers;
  }

  const gtMatchers: VersionMatcher[] = matchers
    .filter(m => (m.comparator === VersionComparison.gt || m.comparator === VersionComparison.gte))
    .sort((a: VersionMatcher, b: VersionMatcher) => compareVersions(a.version, b.version)*-1);

  if (gtMatchers.length > 0) {
    results.push(gtMatchers[0]);
  }

  const ltMatchers: VersionMatcher[] = matchers
    .filter(m => (m.comparator === VersionComparison.lt || m.comparator === VersionComparison.lte))
    .sort((a: VersionMatcher, b: VersionMatcher) => compareVersions(a.version, b.version));

  if (ltMatchers.length > 0) {
    results.push(ltMatchers[0]);
  }

  return results;
}

export const resolveVersions = (versions: Array<string | VersionMatcher[]>): VersionMatcher[] => {
  return versions
    .filter(v => !!v)
    .map(parseVersionMatcher)
    .reduce((result: VersionMatcher[], current: VersionMatcher[]) => {
      return findUnionOfMatchers(result, current);
    }, []);
};

export function findMatchingVersion<T extends {version: string}, M extends {id: string, versions: Array<T>}>(
  module: M,
  matchers: VersionMatcher[],
): T {

  const matchingVersions: Array<T> = module.versions
    .sort((a: T, b: T) => compareVersions(a.version, b.version) * -1)
    .filter(m => matchers.every(v => compareVersions.compare(m.version, v.version, asCompareOperator(v.comparator))));

  if (matchingVersions.length === 0) {
    throw new ModuleVersionNotFound(module, matchers);
  }

  return matchingVersions[0];
}