import {Arguments, Argv} from 'yargs';

import {GitOpsModuleOptions} from '../services';
import {defaultAutoMerge, commonHandler, defaultRateLimit} from './support/gitops-module-common';
import {GitOpsLayer} from "../model";

export const command = 'gitops-module [name]';
export const desc = 'Populates the gitops repo with the provided module contents and configures the ArgoCD application';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .positional('name', {
      description: 'The name of the module that will be added to GitOps',
      type: 'string',
      demandOption: true,
    })
    .option('caCert', {
      type: 'string',
      description: 'Name of the file containing the ca certificate for SSL connections. The value can also be provided in the `GIT_CA_CERT` environment variable.',
      demandOption: false
    })
    .options({
      'contentDir': {
        alias: ['c', "content"],
        description: 'The directory or url where the payload content has been placed. If not provided defaults to current working directory.',
        type: 'string',
        demandOption: false,
      },
      'helmRepoUrl': {
        alias: ['r'],
        description: 'The helm repo url that should be used for the application logic',
        type: 'string',
        demandOption: false
      },
      'helmChart': {
        description: 'The name of the helm chart in the helm repo that should be used',
        type: 'string',
        demandOption: false
      },
      'helmChartVersion': {
        description: 'The version of the helm chart in the helm repo that should be used',
        type: 'string',
        demandOption: false
      },
      'namespace': {
        alias: 'n',
        type: 'string',
        describe: 'Namespace where the secret should be created',
        demandOption: true,
      },
      'caCert': {
        type: 'string',
        description: 'Name of the file containing the ca certificate for SSL connections. The value can also be provided in the `GIT_CA_CERT` environment variable.',
        demandOption: false
      },
      'layer': {
        alias: 'l',
        describe: 'The gitops layer where the configuration will be deployed (infrastructure, services, applications)',
        choices: [GitOpsLayer.infrastructure, GitOpsLayer.services, GitOpsLayer.applications],
        demandOption: false,
      },
      'gitopsConfigFile': {
        describe: 'Name of yaml or json file that contains the gitops config values',
        type: 'string',
        conflicts: 'bootstrapRepoUrl',
        demandOption: false,
      },
      'bootstrapRepoUrl': {
        describe: 'Url of the bootstrap repo that contains the gitops config yaml',
        type: 'string',
        conflicts: 'gitopsConfigFile',
        demandOption: false,
      },
      'gitopsCredentialsFile': {
        describe: 'Name of yaml or json file that contains the gitops credentials',
        type: 'string',
        conflicts: 'token',
        demandOption: false,
      },
      'username': {
        describe: 'Git username to access gitops repo',
        type: 'string',
        conflicts: 'gitopsCredentialsFile',
        demandOption: false,
      },
      'token': {
        describe: 'Git personal access token to access gitops repo',
        type: 'string',
        conflicts: 'gitopsCredentialsFile',
        demandOption: false,
      },
      'applicationPath': {
        describe: 'The path within the payload directory structure where the payload config should be placed. If not provided will default to `name`',
        type: 'string',
        demandOption: false,
      },
      'branch': {
        describe: 'The branch where the payload has been deployed',
        demandOption: false,
      },
      'type': {
        describe: 'The type of component added to the GitOps repo.',
        choices: ['base', 'operators', 'instances'],
        demandOption: false,
        default: 'base',
      },
      'serverName': {
        describe: 'The name of the cluster. If not provided will use `default`',
        demandOption: false,
      },
      'valueFiles': {
        describe: 'Comma-separated list of value files that should be applied to the Argo CD application if using a helm chart',
        demandOption: false,
      },
      'lock': {
        describe: 'Git repo locking style',
        demandOption: false,
        choices: ['optimistic', 'pessimistic', 'branch', 'o', 'p', 'b'],
        default: process.env.LOCK || 'branch',
      },
      'autoMerge': {
        describe: 'Flag indicating that the branch/PR should be automatically merged. Only applies if lock strategy is branch',
        type: 'boolean',
        demandOption: false,
        default: defaultAutoMerge(),
      },
      'delete': {
        alias: 'd',
        describe: 'Flag indicating that the content should be deleted from the repo',
        type: 'boolean',
        demandOption: false,
        default: false,
      },
      'ignoreDiff': {
        describe: 'JSON string containing the ignoreDifferences block for the ArgoCD application. The value can also be passed via a IGNORE_DIFF environment variable',
        type: 'string',
        demandOption: false,
        default: process.env.IGNORE_DIFF,
      },
      'rateLimit': {
        describe: 'Flag indicating that the calls to the git api should be rate limited.',
        type: 'boolean',
        demandOption: false,
        default: defaultRateLimit(),
      },
      'cascadingDelete': {
        describe: 'Flag indicating that the GitOps application should be configured to perform a cascading delete.',
        type: 'boolean',
        demandOption: false,
        default: true,
      },
      'waitForBlocked': {
        describe: 'The amount of time to wait for blocked pull requests. The format is "1h30m10s" or any combination.',
        type: 'string',
        default: '1h',
        demandOption: false
      },
      'tmpDir': {
        describe: 'The temp directory where the gitops repo should be checked out',
        type: 'string',
        default: '/tmp/gitops-module',
        demandOption: false,
      },
      'debug': {
        describe: 'Turn on debug logging',
        type: 'boolean',
        demandOption: false,
      }
    })
};
exports.handler = async (argv: Arguments<GitOpsModuleOptions & {debug: boolean, lock: string}>) => {
  await commonHandler(argv);
};
