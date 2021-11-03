import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import * as YAML from 'js-yaml';

import {YqWrite, YqWriteOptions} from '../../services/yq';

export const command = 'w <file> <field> <value>';
export const desc = 'Read a file <file> and update <field> with <value>'
export const builder = function(argv: Argv<any>) {
  return argv.option('inplace', {
    describe: 'edit file inplace',
    alias: 'i',
    type: 'boolean',
  });
};
exports.handler = async (argv: Arguments<YqWriteOptions>) => {
  const yqWrite: YqWrite = Container.get(YqWrite);

  const result = await yqWrite.write(argv);

  if (!argv.inplace) {
    console.log(YAML.safeDump(result));
  }
};
