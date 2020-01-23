import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {buildOptionWithEnvDefault, DefaultOptionBuilder} from '../util/yargs-support';
import {launchTools, LaunchToolsOptions} from '../services/launch-tools';

export const command = 'launch-tools';
export const desc = 'Launch the IBM Garage for Cloud tools image connected to the current directory';
export const builder =(yargs: Argv<any>) => new DefaultOptionBuilder<LaunchToolsOptions>(yargs)
  .apiKey({optional: true})
  .build()
  .options(buildOptionWithEnvDefault('CLASSIC_USERNAME', {
    alias: ['classicUsername', 'u'],
    describe: 'The username for classic infrastructure. Can be provided as an environment variable',
    type: 'string',
  }))
  .options(buildOptionWithEnvDefault('CLASSIC_API_KEY', {
    alias: ['classicApiKey', 'p'],
    describe: 'The api key for classic infrastructure. Can be provided as an environment variable',
    type: 'string',
  }))
  .options('imageTag', {
    alias: ['t'],
    default: 'latest',
    describe: 'The imageTag (version) of the image that should be used',
    type: 'string',
  });
exports.handler = async (argv: Arguments<LaunchToolsOptions>) => {
  try {
    await launchTools(argv);
  } catch (err) {
    console.log('Error', err);
    process.exit(1);
  }
};

