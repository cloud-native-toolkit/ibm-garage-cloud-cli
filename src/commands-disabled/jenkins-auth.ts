import {Container} from 'typescript-ioc';
import ora from 'ora';
import {Arguments, Argv} from 'yargs';

import {buildOptionWithEnvDefault, DefaultOptionBuilder} from '../util/yargs-support';
import {JenkinsAuth, JenkinsAuthOptions} from '../services/jenkins-auth';

export const command = 'jenkins-auth';
export const desc = 'Generate a Jenkins api token and register it as kubernetes secret';
export const builder = (yargs: Argv<any>) => {
  return new DefaultOptionBuilder(yargs)
    .clusterNamespace()
    .debug()
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
};
exports.handler = async (argv: Arguments<JenkinsAuthOptions>) => {
  const jenkinsAuth: JenkinsAuth = Container.get(JenkinsAuth);

  if (!jenkinsAuth || !jenkinsAuth.isAvailable || !jenkinsAuth.isAvailable()) {
    return;
  }

  const spinner = ora('Configuring Jenkins auth').start();

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
};
