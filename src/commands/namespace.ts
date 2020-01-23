import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {Namespace, NamespaceOptionsModel} from '../services/namespace';
import {Container} from 'typescript-ioc';

export const command = 'namespace';
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
};
exports.handler = async (argv: Arguments<NamespaceOptionsModel>) => {
  const namespaceBuilder: Namespace = Container.get(Namespace);

//      const spinner = ora('Setting up namespace: ' + argv.namespace).start();

  function statusCallback(status: string) {
//        spinner.text = status;
    console.log(status);
  }

  try {
    return await namespaceBuilder.create(argv.namespace, argv.templateNamespace, statusCallback);
  } catch (err) {
    console.log('Error preparing namespace', err);
    process.exit(1);
  } finally {
    //spinner.stop();
  }
};
