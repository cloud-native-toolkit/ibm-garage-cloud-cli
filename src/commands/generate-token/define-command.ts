import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';
import {generateToken, GenerateTokenOptions, isAvailable} from '../generate-token';
import {CommandLineOptions} from '../../model';

export const defineGenerateTokenCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  if (!isAvailable()) {
    return;
  }

  return {
    command,
    describe: 'generate a Jenkins api token',
    builder: (yargs: Argv<any>) => {
      return new DefaultOptionBuilder(yargs)
        .debug()
        .build()
        .options(buildOptionWithEnvDefault('JENKINS_HOST', {
          description: 'The host to the Jenkins server',
          alias: 'host',
        }))
        .options(buildOptionWithEnvDefault('JENKINS_URL', {
          description: 'The url to the Jenkins server',
          alias: 'url',
        }))
        .options(buildOptionWithEnvDefault('JENKINS_USERNAME', {
          description: 'The username of the user for whom the api token will be generated',
          default: 'admin',
          alias: ['username', 'u'],
        }))
        .options(buildOptionWithEnvDefault('JENKINS_PASSWORD', {
          description: 'The password of the user',
          required: true,
          alias: ['password', 'p'],
        }))
        .options('yaml', {
          description: 'Output values as yaml',
          type: 'boolean'
        });
    },
    handler: async (argv: Arguments<GenerateTokenOptions & CommandLineOptions>) => {
      if (argv.debug) {
        console.log('options', argv);
      }

      try {
        const apiToken = await generateToken(argv);

        if (argv.yaml) {
          const yamlBase = typeof argv.yaml === 'string' ? argv.yaml : 'jenkins';

          console.log(`${yamlBase}:`);
          console.log(`    url: "${argv.url}"`);
          console.log(`    username: "${argv.username}"`);
          console.log(`    password: "${argv.password}"`);
          console.log(`    api_token: "${apiToken}"`);
        } else {
          console.log(apiToken);
        }
      } catch (err) {
        console.log('Error generating token', err);
      }
    }
  };
};
