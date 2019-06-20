import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';

import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {GetVlanOptions} from './get-vlan-options.model';
import {getVlan, VlanResult} from './get-vlan';

export const defineGetVlanCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'print out the vlan values',
    builder: (yargs: Argv<any>) => yargs,
    handler: async (argv: Arguments<GetVlanOptions>) => {
      try {
        const spinner = ora('Getting vlan').start();

        function statusCallback(status: string) {
          spinner.text = status;
        }

        const result: VlanResult = await getVlan(argv, statusCallback);

        spinner.stop();

        Object.keys(result).forEach(key => {
          console.log(`${key}="${result[key]}"`);
        })
      } catch (err) {
        process.exit(1);
      }
    }
  };
};
