
export function decode(value: string): string {
  return Buffer.from(value, 'base64').toString('ascii');
}

export function encode(value: string): string {
  return Buffer.from(value).toString('base64');
}
