import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';

import {GitOpsModuleApi, GitOpsModuleOptions} from '../services/gitops-module';
import {Logger, verboseLoggerFactory} from '../util/logger';
import {ClaimedMutex, Mutex} from '../util/mutex';

export const command = 'gitops-namespace [name] [contentDir]';
export const desc = 'Populates the gitops repo with the configuration for a namespace';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .positional('name', {
      description: 'The name of the module that will be added to GitOps',
      type: 'string',
      demandOption: true,
    })
    .option('contentDir', {
      alias: 'c',
      description: 'The directory where the payload content has been placed. If not provided defaults to current working directory.',
      type: 'string',
      demandOption: false,
    })
    .option('namespace', {
      alias: 'n',
      type: 'string',
      describe: 'Namespace where the secret should be created',
      demandOption: false,
      default: 'default'
    })
    .option('gitopsConfigFile', {
      describe: 'Name of yaml or json file that contains the gitops config values',
      type: 'string',
      conflicts: 'bootstrapRepoUrl',
      demandOption: false,
    })
    .option('bootstrapRepoUrl', {
      describe: 'Url of the bootstrap repo that contains the gitops config yaml',
      type: 'string',
      conflicts: 'gitopsConfigFile',
      demandOption: false,
    })
    .option('gitopsCredentialsFile', {
      describe: 'Name of yaml or json file that contains the gitops credentials',
      type: 'string',
      conflicts: 'token',
      demandOption: false,
    })
    .option('token', {
      describe: 'Git personal access token to access gitops repo',
      type: 'string',
      conflicts: 'gitopsCredentialsFile',
      demandOption: false,
    })
    .option('applicationPath', {
      describe: 'The path within the payload directory structure where the payload config should be placed. If not provided will default to `name`',
      type: 'string',
      demandOption: false,
    })
    .option('branch', {
      describe: 'The branch where the payload has been deployed',
      demandOption: false,
    })
    .option('serverName', {
      describe: 'The name of the cluster. If not provided will use `default`',
      demandOption: false,
    })
    .option('valueFiles', {
      describe: 'Comma-separated list of value files that should be applied to the Argo CD application if using a helm chart',
      demandOption: false,
    })
    .option('tmpDir', {
      describe: 'The temp directory where the gitops repo should be checked out',
      type: 'string',
      default: '/tmp/gitops-module/',
      require: false,
    })
    .option('debug', {
      describe: 'Turn on debug logging',
      type: 'boolean',
      require: false,
    });
};
exports.handler = async (argv: Arguments<GitOpsModuleOptions & {debug: boolean}>) => {
  Container.bind(Logger).factory(verboseLoggerFactory(argv.debug));

  const mutex = new Mutex(argv.tmpDir, 'gitops-module');

  const args: GitOpsModuleOptions = Object.assign(
    {},
    argv,
    {
      isNamespace: true,
      layer: 'infrastructure',
    });

  let claim: ClaimedMutex;
  try {
    claim = await mutex.claim({name: args.name, namespace: args.namespace, contentDir: args.contentDir});

    const service: GitOpsModuleApi = Container.get(GitOpsModuleApi);

    await service.populate(args);
  } catch (err) {
    console.error('Error running populate', err);
  } finally {
    await claim.release();
  }
};
