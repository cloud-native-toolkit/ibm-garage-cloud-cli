import {Container} from 'typescript-ioc';
import {Arguments, Argv, CommandModule, PositionalOptions} from 'yargs';

import {NamespaceOptionsModel} from './namespace-options.model';
import {Namespace} from './namespace';
import {YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import ora from 'ora';

export const defineNamespace: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {

  const commandWithArg: string = `${command} <namespace>`;

  return {
    command: commandWithArg,
    describe: 'Create a namespace (if it doesn\'t exist) and prepare it with the necessary configuration',
    builder: (yargs: Argv<any>) => {
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
    },
    handler: async (argv: Arguments<NamespaceOptionsModel>) => {
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
    },
  }
};
