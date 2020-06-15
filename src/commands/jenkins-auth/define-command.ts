import ora from 'ora';
import {Arguments, Argv, CommandModule} from 'yargs';
import {Container} from 'typescript-ioc';

import {
  buildOptionWithEnvDefault,
  DefaultOptionBuilder,
  YargsCommandDefinition,
  YargsCommandDefinitionArgs
} from '../../util/yargs-support';
import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {JenkinsAuth} from './config-jenkins-auth';

export const defineJenkinsAuth: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  const jenkinsAuth: JenkinsAuth = Container.get(JenkinsAuth);

  // if (!jenkinsAuth.isAvailable()) {
  //   return;
  // }

  const kubeConfigSet = true;

  return {
    command,
    describe: 'Generate a Jenkins api token and register it as kubernetes secret',
    builder: (yargs: Argv<any>) => {
      return new DefaultOptionBuilder(yargs)
        .debug()
        .clusterNamespace()
        .build()
        .options(buildOptionWithEnvDefault('JENKINS_HOST', {
          description: 'The host name to the Jenkins server',
          required: false,
          alias: 'host',
        }))
        .options(buildOptionWithEnvDefault('JENKINS_URL', {
          description: 'The url of the Jenkins server',
          required: false,
          alias: 'url',
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
        })
        .options('inCluster', {
          type: 'boolean',
          description: 'Flag indicating that the kube configuration should come from the enclosing cluster',
          required: false
        });
    },
    handler: async (argv: Arguments<JenkinsAuthOptions>) => {
      const spinner = ora('Configuring Jenkins auth for namespace: ' + argv.namespace).start();

      function statusCallback(status: string) {
        spinner.text = status;
      }

      try {
        await jenkinsAuth.configJenkinsAuth(argv, statusCallback);
      } catch (err) {
        console.log('Error configuring Jenkins authentication', err);
        process.exit(1);
      } finally {
        spinner.stop();
      }
    }
  };
};
