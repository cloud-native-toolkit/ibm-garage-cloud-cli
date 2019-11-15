import {YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';

export const defineYqCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command: `${command} <command>`,
    describe: '',
    builder: (yargs: Argv<any>) => {
      return yargs.commandDir('yq_commands');
    },
    handler: (args: Arguments<any>) => {
    }
  };
};
