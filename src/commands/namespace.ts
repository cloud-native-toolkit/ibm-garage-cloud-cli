import {Arguments, Argv} from 'yargs';
import {Namespace, NamespaceOptionsModel} from '../services/namespace';
import {Container} from 'typescript-ioc';
import * as ora from 'ora';
import * as chalk from 'chalk';

export const command = 'namespace [namespace]';
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
    .option('jenkins', {
      describe: 'flag to install Jenkins into the namespace (only applies to OpenShift clusters)',
      type: 'boolean',
    })
};
exports.handler = async (argv: Arguments<NamespaceOptionsModel>) => {
  const namespaceBuilder: Namespace = Container.get(Namespace);

  if (!argv.namespace) {
    console.log(chalk.red(`Please specify the namespace as the first argument. Run '${argv.$0} namespace --help' for more information`));
    process.exit(1);
  }

  console.log(`Setting up namespace ${chalk.yellow(argv.namespace)} and serviceAccount ${chalk.yellow(argv.serviceAccount)}`);

  const spinner = ora('Setting up namespace: ' + argv.namespace).start();

  function statusCallback(status: string) {
    spinner.text = status;
  }

  try {
    return await namespaceBuilder.create(argv, statusCallback);
  } catch (err) {
    console.log('Error preparing namespace', err);
    process.exit(1);
  } finally {
    spinner.stop();
  }
};
