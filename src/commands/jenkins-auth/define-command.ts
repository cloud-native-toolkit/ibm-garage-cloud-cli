import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';
import {isAvailable} from '../generate-token';
import {configJenkinsAuth} from './config-jenkins-auth';
import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';

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
        .debug()
        .build()
        .options(buildOptionWithEnvDefault('JENKINS_HOST', {
          description: 'The url to the Jenkins server',
          required: true,
          alias: 'host',
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
    handler: async (argv: Arguments<JenkinsAuthOptions>) => {
      await configJenkinsAuth(argv);
    }
  };
};
