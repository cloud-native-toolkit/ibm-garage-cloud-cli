import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {ToolConfigOptions} from '../services/tool-config/tool-config-options.model';
import {ToolsConfig} from '../services/tool-config/tool-config';
import {Container} from 'typescript-ioc';

export const command = 'tool-config';
export const desc = 'Create the config map and secret for a tool configured in the environment';
export const builder = (yargs: Argv<any>) => yargs
  .option('namespace', {
    alias: 'n',
    describe: 'The namespace for the config',
    default: 'tools',
  })
  .option('name', {
    describe: 'The name of the tool that is being configured',
    requires: true,
  })
  .option('url', {
    describe: 'The url of the component',
  })
  .option('username', {
    describe: 'The name of the user for the tool',
  })
  .option('password', {
    describe: 'The password for the user for the tool'
  });
exports.handler = async (argv: Arguments<ToolConfigOptions>) => {
  const toolsConfig: ToolsConfig = Container.get(ToolsConfig);

  await toolsConfig.configureTool(argv);
};
