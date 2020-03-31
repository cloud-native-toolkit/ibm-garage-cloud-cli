
export function addCommandToArgs(args: string[], command: string): string[] {
  return args.slice(0, 2).concat([command]).concat(args.slice(2));
}
