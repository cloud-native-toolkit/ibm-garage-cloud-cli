import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import ora from 'ora';

import {CommandLineOptions} from '../model';
import {buildOptionWithEnvDefault, DefaultOptionBuilder} from '../util/yargs-support';
import {GenerateToken, GenerateTokenOptions} from '../services/generate-token';

export const command = 'generate-token';
export const desc = 'Generate a Jenkins api token';
export const builder = (yargs: Argv<any>) => {
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
};
exports.handler = async (argv: Arguments<GenerateTokenOptions & CommandLineOptions>) => {
  const generateTokenCommand: GenerateToken = Container.get(GenerateToken);

  if (!generateTokenCommand || !generateTokenCommand.isAvailable || !generateTokenCommand.isAvailable()) {
    return;
  }

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
    const apiToken = await generateTokenCommand.generateToken(options, statusCallback);

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
};
