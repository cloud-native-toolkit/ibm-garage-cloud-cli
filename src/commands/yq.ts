import {Arguments, Argv} from 'yargs';

export const command = 'yq <command>';
export const desc = 'lightweight yaml command-line processor that addresses deficiencies with the existing `yq` command';
export const builder = (yargs: Argv<any>) => {
  return yargs.commandDir('yq_subcommands');
};
exports.handler = (args: Arguments<any>) => {
};
