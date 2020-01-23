import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';

export const command = 'yq <command>';
export const desc = '';
export const builder = (yargs: Argv<any>) => {
  return yargs.commandDir('yq_subcommands');
};
exports.handler = (args: Arguments<any>) => {
};
