import ora from 'ora';
import {Arguments, Argv, CommandModule} from 'yargs';

import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {isAvailable} from '../generate-token';
import {configJenkinsAuth} from './config-jenkins-auth';
import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';

export const defineJenkinsAuth: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  if (!isAvailable()) {
    return;
  }

  const kubeConfigSet = !!process.env.KUBECONFIG;

  return {
    command,
    describe: 'generate a Jenkins api token and register it as kubernetes secret',
    builder: (yargs: Argv<any>) => {
      return new DefaultOptionBuilder(yargs)
        .kubeConfig()
        .apiKey({optional: kubeConfigSet})
        .region({optional: kubeConfigSet})
        .resourceGroup({optional: kubeConfigSet})
        .clusterName({optional: kubeConfigSet})
        .clusterNamespace({optional: true, default: 'tools'})
        .debug()
        .build()
        .options(buildOptionWithEnvDefault('JENKINS_HOST', {
          description: 'The host name to the Jenkins server',
          required: false,
          alias: 'host',
        }))
        .options(buildOptionWithEnvDefault('JENKINS_USERNAME', {
          description: 'The username of the user for whom the api token will be generated',
          default: 'admin',
          alias: ['username', 'u'],
        }))
        .options(buildOptionWithEnvDefault('JENKINS_PASSWORD', {
          description: 'The password of the user',
          required: false,
          alias: ['password', 'p'],
        }))
        .options('jenkinsApiToken', {
          description: 'The Jenkins API Token. If not provided one will be generated',
          required: false
        });
    },
    handler: async (argv: Arguments<JenkinsAuthOptions>) => {
      const spinner = ora('Configuring Jenkins auth').start();

      function statusCallback(status: string) {
        spinner.text = status;
      }

      try {
        await configJenkinsAuth(argv, statusCallback);
      } catch (err) {
        console.log('Error configuring Jenkins authentication', err);
        process.exit(1);
      } finally {
        spinner.stop();
      }
    }
  };
};
