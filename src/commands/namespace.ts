import {Arguments, Argv} from 'yargs';
import {Container, Scope} from 'typescript-ioc';
import * as chalk from 'chalk';

import {Namespace, NamespaceOptionsModel} from '../services/namespace';
import {logFactory, Logger} from '../util/logger';
import {cloudshellThrottleConfig, ThrottleConfig} from '../util/throttle';

export const command = 'sync [namespace]';
export const aliases = ['project', 'namespace'];
export const desc = 'Create a namespace (if it doesn\'t exist) and prepare it with the necessary configuration';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .positional('namespace', {
      require: true,
      describe: 'The namespace that will be created and/or prepared',
    })
    .option('templateNamespace', {
      alias: 't',
      describe: 'the template namespace that will be the source of the config',
      default: 'tools',
      type: 'string',
    })
    .option('serviceAccount', {
      alias: 'z',
      describe: 'the service account that will be used within the namespace',
      default: 'default',
      type: 'string',
    })
    .option('tekton', {
      alias: 'p',
      describe: 'flag indicating the tekton pipeline service account should be given privileged scc',
      default: false,
      type: 'boolean'
    })
    .option('puller', {
      describe: 'Flag indicating image-puller permission should be granted in the namespace',
      default: true,
      type: 'boolean'
    })
    .option('argocd', {
      alias: 'a',
      describe: 'flag indicating that argocd should be given permission to manage the namespace',
      default: false,
      type: 'boolean'
    })
    .option('argocdNamespace', {
      alias: 'x',
      describe: 'the namespace where argocd is running',
      default: 'openshift-gitops',
      type: 'string'
    })
    .option('verbose', {
      describe: 'flag to produce more verbose logging',
      type: 'boolean'
    })
    .option('throttle', {
      type: 'boolean',
      description: 'Flag indicating that requests to the kubernetes api should be throttled',
      demandOption: false,
      default: process.env.CLOUDSHELL === 'true',
    });
};
exports.handler = async (argv: Arguments<NamespaceOptionsModel & {verbose: boolean, throttle: boolean}>) => {

  Container.bind(Logger).factory(logFactory({verbose: argv.verbose})).scope(Scope.Singleton);
  if (argv.throttle) {
    Container.bind(ThrottleConfig).factory(cloudshellThrottleConfig);
  }

  const logger: Logger = Container.get(Logger);

  const namespaceBuilder: Namespace = Container.get(Namespace);

  if (!argv.namespace) {
    logger.log(chalk.red(`Please specify the namespace as the first argument. Run '${argv.$0} namespace --help' for more information`));
    process.exit(1);
  }

  logger.log(`Setting up namespace ${chalk.yellow(argv.namespace)}`);
  if (argv.throttle) {
    logger.log('  Throttling requests to the cluster api');
  }

  function statusCallback(status: string) {
    logger.text = status;
  }

  try {
    return await namespaceBuilder.create(argv, statusCallback);
  } catch (err) {
    logger.error('Error preparing namespace', err);
    process.exit(1);
  } finally {
    logger.stop();
  }
};
