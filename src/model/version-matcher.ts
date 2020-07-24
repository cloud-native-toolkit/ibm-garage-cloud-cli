
export enum VersionComparison {
  major = '^',
  minor = '~',
  gt = '>',
  gte = '>=',
  lt = '<',
  lte = '<=',
  eq = '='
}

export function versionComparisonFromString(value: string): VersionComparison {
  const comparisons: VersionComparison[] = Object.keys(VersionComparison)
    .filter(key => VersionComparison[key] === value)
    .map(key => VersionComparison[key]);

  return (comparisons.length > 0) ? comparisons[0] : VersionComparison.eq;
}

export interface VersionMatcher {
  comparator: VersionComparison;
  version: string;
}
