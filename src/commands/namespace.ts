import {Arguments, Argv} from 'yargs';
import {Container, Scope} from 'typescript-ioc';
import * as chalk from 'chalk';

import {Namespace, NamespaceOptionsModel} from '../services/namespace';
import {logFactory, Logger} from '../util/logger';

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
    .option('verbose', {
      describe: 'flag to produce more verbose logging',
      type: 'boolean'
    })
};
exports.handler = async (argv: Arguments<NamespaceOptionsModel & {verbose: boolean}>) => {

  Container.bind(Logger).factory(logFactory({verbose: argv.verbose})).scope(Scope.Singleton);

  const logger: Logger = Container.get(Logger);

  const namespaceBuilder: Namespace = Container.get(Namespace);

  if (!argv.namespace) {
    logger.log(chalk.red(`Please specify the namespace as the first argument. Run '${argv.$0} namespace --help' for more information`));
    process.exit(1);
  }

  logger.log(`Setting up namespace ${chalk.yellow(argv.namespace)}`);


  logger.text = 'Setting up namespace: ' + argv.namespace;

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
