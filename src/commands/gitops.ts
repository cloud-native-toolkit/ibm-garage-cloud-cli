import {Arguments, Argv} from 'yargs';

import {handler as gitSecretHandler} from './git-secret';
import {CreateGitSecretOptions} from '../services/git-secret';

export const command = 'gitops';
export const desc = 'Registers the git repository in the kubernetes cluster as the gitops repository for the given namespace';
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
      describe: 'Directory where the repository is stored. If not provided the current working directory is used',
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
    });
};
exports.handler = async (argv: Arguments<CreateGitSecretOptions & {namespace: string}>) => {
  await gitSecretHandler(Object.assign({}, argv, {name: 'gitops-repo'}));
};
