import {Arguments, Argv, CommandModule} from 'yargs';
import {
  buildOptionWithEnvDefault,
  DefaultOptionBuilder,
  YargsCommandDefinition,
  YargsCommandDefinitionArgs
} from '../../util/yargs-support';
import {launchTools} from './launch-tools';
import {LaunchToolsOptions} from './launch-tools-options.model';

export const defineLaunchToolsCommand: YargsCommandDefinition = <T>({command, describe}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: describe || 'Launch the IBM Garage for Cloud tools image connected to the current directory',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<LaunchToolsOptions>(yargs)
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
      }),
    handler: async (argv: Arguments<LaunchToolsOptions>) => {
      try {
        await launchTools(argv);
      } catch (err) {
        console.log('Error', err);
        process.exit(1);
      }
    }
  };
};
