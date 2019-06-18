import {Arguments, Argv, CommandModule} from 'yargs';
import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {GetVlanOptions} from './get-vlan-options.model';
import {getVlan} from './get-vlan';

export const defineGetVlanCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'print out the vlan values',
    builder: (yargs: Argv<any>) => yargs,
    handler: async (argv: Arguments<GetVlanOptions>) => {
      try {
        await getVlan(argv);
      } catch (err) {
        process.exit(1);
      }
    }
  };
};
