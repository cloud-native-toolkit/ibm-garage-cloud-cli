import {Container} from 'typescript-ioc';
import * as open from 'open';
import {Arguments, Argv} from 'yargs';

import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {checkKubeconfig} from '../util/kubernetes';
import {GetConsoleUrlApi} from '../services/console';

interface SelectedIngress {
  selection: string;
}

export const command = 'console';
export const desc = 'Launch the IKS or OpenShift admin console';
export const builder = (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
  .quiet()
  .debug()
  .build();
exports.handler =  async (argv: Arguments<CommandLineOptions>) => {

  try {
    await checkKubeconfig();

    const consoleCommand: GetConsoleUrlApi = Container.get(GetConsoleUrlApi);

    try {
      const consoleUrl = await consoleCommand.getConsoleUrl();

      console.log('Console url for cluster: ' + consoleUrl);
      await open(consoleUrl);
    } catch (err) {
      console.log('Error retrieving console url: ' + err.message);
      if (argv.debug) {
        console.error(err);
      }
    }
  } catch (err) {
    console.log('Error getting credentials:', err.message);
    if (argv.debug) {
      console.log('Error getting credentials:', err);
    }
    process.exit(1);
  }
};
