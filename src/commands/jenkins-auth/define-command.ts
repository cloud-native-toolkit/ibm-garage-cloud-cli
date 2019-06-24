import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';
import {generateToken, GenerateTokenOptions, isAvailable} from '../generate-token';

export const defineJenkinsAuth: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  if (!isAvailable()) {
    return;
  }

  return {
    command,
    describe: 'generate a Jenkins api token and register it as kubernetes secret',
    builder: (yargs: Argv<any>) => {
      return new DefaultOptionBuilder(yargs)
        .apiKey()
        .region()
        .resourceGroup()
        .clusterName()
        .build()
        .options(buildOptionWithEnvDefault('JENKINS_HOST', {
          description: 'The url to the Jenkins server',
          required: true,
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
        }));
    },
    handler: async (argv: Arguments<GenerateTokenOptions>) => {
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
    }
  };
};
