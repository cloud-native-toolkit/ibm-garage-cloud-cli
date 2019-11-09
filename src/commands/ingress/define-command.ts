import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';
import {Container} from 'typescript-ioc';
import {prompt, Questions} from 'inquirer';
import * as open from 'open';

import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {CommandLineOptions} from '../../model';
import {checkKubeconfig} from '../../util/kubernetes';
import {GetIngress} from './ingress';

interface SelectedIngress {
  selection: string;
}

export const defineIngressCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: 'List the current ingress hosts for deployed apps in a namespace',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
      .clusterNamespace({
        optional: false,
        describe: 'The cluster namespace where the apps are deployed',
        default: 'dev',
      })
      .quiet()
      .debug()
      .build()
      .option('print', {
        requiresArg: false,
        describe: 'Flag indicating that values should simply be printed',
        type: 'boolean',
        default: false,
      }),
    handler: async (argv: Arguments<{namespace: string; yaml: boolean; print: boolean} & CommandLineOptions>) => {
      let spinner;

      function statusCallback(status: string) {
        if (!spinner) {
          spinner = ora(status).start();
        } else {
          spinner.text = status;
        }
      }

      try {
        await checkKubeconfig();

        const command: GetIngress = Container.get(GetIngress);

        // Retrieve the results
        const result: Array<{name: string, url: string}> = await command.getIngress(argv.namespace, statusCallback);

        if (spinner) {
          spinner.stop();
        }

        const choices = result.map(ingress => ({name: `${ingress.name} - ${ingress.url}`, value: ingress.url}));
        function printResults() {
          choices.forEach(choice => {
            console.log('  ' + choice.name);
          });
        }

        if (argv.print) {
          console.log(`Ingresses in the '${argv.namespace}' namespace`);
          printResults();
          process.exit(0);
        }

        const input: SelectedIngress = await prompt([{
          type: 'rawlist',
          choices: [{
            key: 'x',
            name: 'Exit',
            value: 'exit'
          } as { key?: string, name: string, value: string }].concat(...choices),
          name: 'selection',
          message: `Ingresses in the '${argv.namespace}' namespace. Select an ingress to launch the default browser or 'Exit'.`,
          default: true,
          suffix: '\n'
        }]);

        if (input.selection !== 'exit') {
          await open(input.selection);
        } else {
          printResults();
        }
      } catch (err) {
        if (spinner) {
          spinner.stop();
        }

        console.log('Error getting credentials:', err.message);
        if (argv.debug) {
          console.log('Error getting credentials:', err);
        }
        process.exit(1);

      }
    }
  };
};
