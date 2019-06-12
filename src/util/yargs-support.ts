import {Options} from 'yargs';

import {EnvironmentOptionKey} from '../model/environment-options';

export function buildOptionWithEnvDefault(key: EnvironmentOptionKey, options: Options): {[key: string]: Options} {
  const result = {};
  const defaultOption = process.env[key] || options.default;
  result[key] = Object.assign({}, options, defaultOption ? {default: defaultOption} : {});
  return result;
}
