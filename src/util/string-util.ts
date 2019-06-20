
export function splitLines(lines: string): string[] {
  return lines.match(/[^\r\n]+/g);
}
