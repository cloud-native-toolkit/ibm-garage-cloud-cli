import {Arguments, Argv, CommandModule} from 'yargs';
import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {GetVlanOptions} from './get-vlan-options.model';
import {getVlan} from './get-vlan';

export const defineGetVlanCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'print out the vlan values',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<GetVlanOptions>(yargs)
      .region({
        optional: true,
        default: 'us-south',
        describe: 'The IBM Cloud region where the cluster will be defined. The value defaults to "us-south"',
      })
      .build(),
    handler: async (argv: Arguments<GetVlanOptions>) => {
      try {
        await getVlan(argv);
      } catch (err) {
        process.exit(1);
      }
    }
  };
};
