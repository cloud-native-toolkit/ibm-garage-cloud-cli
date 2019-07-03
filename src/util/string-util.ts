
export function splitLines(lines?: string): string[] {
  if (lines === undefined || lines === null) {
    return [];
  }

  return lines.match(/[^\r\n]+/g) || [lines];
}
