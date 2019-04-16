import ProcessEnv = NodeJS.ProcessEnv;
import {Arguments, Options} from 'yargs';

import {EnvironmentOptionKeys, EnvironmentOptions} from '../model';

export function buildOptionWithEnvDefault(key: string, options: Options): {[key: string]: Options} {
  const result = {};
  const defaultOption = process.env[key] || options.default;
  result[key] = Object.assign({}, options, defaultOption ? {default: defaultOption} : {});
  return result;
}

export function extractEnvironmentProperties(propertyNames: string[], argv: Arguments<EnvironmentOptions>) {
  return propertyNames
    .reduce(
      (result: ProcessEnv, name: EnvironmentOptionKeys) => {
        if (argv[name]) {
          result[name] = argv[name];
        }
        return result;
      },
      process.env,
    );
}
