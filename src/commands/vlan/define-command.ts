import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';
import {Container} from 'typescript-ioc';

import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {GetVlanOptions} from './get-vlan-options.model';
import {GetVlan, VlanResult} from './get-vlan';

export const defineGetVlanCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: 'Print out the vlan values',
    builder: (yargs: Argv<any>) => yargs
      .option('datacenter', {
        alias: 'd',
        describe: 'the datacenter to use. if not provided it will use the first one listed for the region'
      }),
    handler: async (argv: Arguments<GetVlanOptions>) => {
      try {
        const spinner = ora('Getting vlan').start();

        function statusCallback(status: string) {
          spinner.text = status;
        }

        const command: GetVlan = Container.get(GetVlan);
        const result: VlanResult = await command.getVlan(argv, statusCallback);

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
