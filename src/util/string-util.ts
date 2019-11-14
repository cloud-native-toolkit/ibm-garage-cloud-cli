
export function splitLines(lines?: string): string[] {
  if (lines === undefined || lines === null) {
    return [];
  }

  return lines.match(/[^\r\n]+/g) || [lines];
}

export function isString(value: string | string[]): value is string {
  return value && typeof value === 'string';
}

export function stringToStringArray(value: string | string[]): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  return isString(value) ? value.split(',') : value;
}
