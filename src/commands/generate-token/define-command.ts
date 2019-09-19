import ora from 'ora';
import {Arguments, Argv, CommandModule} from 'yargs';

import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {GenerateToken, generateToken, GenerateTokenOptions} from '../generate-token';
import {CommandLineOptions} from '../../model';
import {Container} from 'typescript-ioc';

export const defineGenerateTokenCommand: YargsCommandDefinition = <T>(commandName: string): CommandModule<T> => {
  const command: GenerateToken = Container.get(GenerateToken);

  if (!command.isAvailable()) {
    return;
  }

  return {
    command: commandName,
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

      const options = Object.assign(
        {},
        argv,
        {url: argv.url || `http://${argv.host}`},
      );

      if (options.debug) {
        console.log('options', options);
      }

      const spinner = ora('Generating Jenkins api token').start();

      function statusCallback(status: string) {
        spinner.text = status;
      }

      try {
        const apiToken = await command.generateToken(options, statusCallback);

        if (argv.yaml) {
          const yamlBase = typeof argv.yaml === 'string' ? argv.yaml : 'jenkins';

          console.log(`${yamlBase}:`);
          console.log(`    url: "${options.url}"`);
          console.log(`    username: "${options.username}"`);
          console.log(`    password: "${options.password}"`);
          console.log(`    api_token: "${apiToken}"`);
        } else {
          console.log(apiToken);
        }
      } catch (err) {
        console.log('Error generating token', err);
        process.exit(1);
      } finally {
        spinner.stop();
      }
    }
  };
};
