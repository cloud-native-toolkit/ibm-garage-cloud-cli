import {Container} from 'typescript-ioc';
import {Arguments, Argv} from 'yargs';
import * as chalk from 'chalk';

import {CreateGitSecret, CreateGitSecretOptions} from '../services/git-secret';
import {Namespace} from '../services/namespace';

export const command = 'git-secret [name]';
export const desc = 'Create a kubernetes secret that contains the url, username, and personal access token for a git repo';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .option('namespace', {
      alias: 'n',
      type: 'string',
      describe: 'Namespace where the secret should be created',
    })
    .option('values', {
      describe: 'Values file yaml that contains additional attributes to add to the secret',
      type: 'string',
      require: false,
    })
    .option('workingDir', {
      alias: 'd',
      describe: 'Directory where the repository is stored',
      type: 'string',
      require: false,
    })
    .option('gitUsername', {
      alias: 'u',
      describe: 'Git username for the current repository',
      type: 'string',
      require: false,
    })
    .option('gitPat', {
      alias: 'p',
      describe: 'Git personal access token for the current repository',
      require: false,
    })
    .option('replace', {
      describe: 'Flag indicating that the secret should be replaced if it already exists',
      type: 'boolean',
      require: false,
    })
    .positional('name', {
      describe: 'Name of the secret that will be created. the value will default to {git org}.{git repo} it not provided',
      require: false,
    });
};
export const handler = async (argv: Arguments<CreateGitSecretOptions & {namespace: string}>) => {
  const cmd: CreateGitSecret = Container.get(CreateGitSecret);

  let spinner;
  function statusCallback(status: string) {
    // if (!spinner) {
    //   spinner = ora(status).start();
    // } else {
    //   spinner.text = status;
    // }

    console.log(status);
  }

  if (!argv.namespace) {
    try {
      const namespaceService: Namespace = Container.get(Namespace);
      const currentProject: string = await namespaceService.getCurrentProject();

      if (currentProject != 'default') {
        argv.namespace = currentProject;
      }
    } catch (err) {}
  }

  if (!argv.namespace) {
    console.log(chalk.red('The namespace was not provided'));
    console.log(`Please provide it by adding ${chalk.yellow('-n {namespace}')} or by setting the namespace/project in the current context, e.g. ${chalk.yellow('oc project {namespace}')}`);
  } else {
    console.log(`Setting the git credentials in the ${chalk.yellow(argv.namespace)} namespace`);
  }

  try {
    await cmd.getParametersAndCreateSecret(
      Object.assign(
        {},
        argv,
        {
          namespaces: [argv.namespace],
        }
      ),
      statusCallback,
    );
  } finally {
    if (spinner) {
      spinner.stop();
    }
  }
};
