import * as YAML from 'js-yaml';
import * as fs from 'fs-extra';

export function splitLines(lines?: string): string[] {
  if (lines === undefined || lines === null) {
    return [];
  }

  return lines.match(/[^\r\n]+/g) || [lines];
}

export function isString(value: any): value is string {
  return value && typeof value === 'string';
}

export function stringToStringArray(value: string | string[]): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  return isString(value) ? value.split(',') : value;
}

export const parsers: {[type: string]: <T> (content: string | Buffer) => T} = {
  'yaml': <T> (content: string | Buffer) => YAML.load(content.toString()) as T,
  'yml': <T> (content: string | Buffer) => YAML.load(content.toString()) as T,
  'json': <T> (content: string | Buffer) => JSON.parse(content.toString()) as T,
  'pem': <T> (content: string | Buffer) => (content.toString() as unknown) as T,
};

export async function parseFile<T = any>(filename: string): Promise<T> {

  const extension = filename.replace(/.*[.](.*)$/, '$1');

  const parser = parsers[extension];
  if (!parser) {
    throw new Error('Unknown extension for parsing: ' + extension);
  }

  return parser(await fs.readFile(filename));
}

export async function parseString<T = any>(contents: string): Promise<T> {

  const firstChar = contents.charAt(0)

  if (firstChar === '{' || firstChar === '[') {
    return parsers.json(contents)
  } else {
    return parsers.yaml(contents)
  }
}
