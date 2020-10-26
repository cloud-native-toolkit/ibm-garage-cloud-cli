import {Container} from 'typescript-ioc';
import {prompt} from 'inquirer';
import * as open from 'open';
import {Arguments, Argv} from 'yargs';

import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {checkKubeconfig} from '../util/kubernetes';
import {GetEndpoints} from '../services/endpoints';
import {Namespace} from '../services/namespace';
import * as chalk from 'chalk';

const ora = require('ora');

interface SelectedIngress {
  selection: string;
}

export const command = 'endpoints';
export const aliases = ['ingress', 'endpoint', 'ingresses'];
export const desc = 'List the current ingress hosts for deployed apps in a namespace';
export const builder = (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
  .quiet()
  .debug()
  .build()
  .options('namespace', {
    alias: 'n',
    describe: 'The namespace from which the endpoints will be read'
  })
  .option('print', {
    requiresArg: false,
    describe: 'Flag indicating that values should simply be printed',
    type: 'boolean',
    default: false,
  });
exports.handler =  async (argv: Arguments<{namespace: string; yaml: boolean; print: boolean} & CommandLineOptions>) => {
  let spinner;

  function statusCallback(status: string) {
    if (!spinner) {
      spinner = ora(status).start();
    } else {
      spinner.text = status;
    }
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
    console.log(`Getting the endpoints in the ${chalk.yellow(argv.namespace)} namespace`);
  }

  try {
    await checkKubeconfig();

    const command: GetEndpoints = Container.get(GetEndpoints);

    // Retrieve the results
    const result: Array<{name: string, url: string}> = await command.getEndpoints(argv.namespace, statusCallback);

    if (spinner) {
      spinner.stop();
    }

    const choices = result.map(ingress => ({name: `${ingress.name} - ${ingress.url}`, value: ingress.url}));
    function printResults() {
      choices.forEach(choice => {
        console.log('  ' + choice.name);
      });
    }

    if (choices.length === 0) {
      console.log(`No endpoints found for the '${argv.namespace}' namespace`);
      process.exit(0);
    }

    if (argv.print) {
      console.log(`Endpoints in the '${argv.namespace}' namespace`);
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
      message: `Endpoints in the '${argv.namespace}' namespace. Select an endpoint to launch the default browser or 'Exit'.`,
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
};
