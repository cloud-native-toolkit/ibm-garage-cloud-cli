import {Arguments, Argv, CommandModule} from 'yargs';
import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {ToolConfigOptions} from './tool-config-options.model';
import {ToolsConfig} from './tool-config';
import {Container} from 'typescript-ioc';

export const defineToolConfigCommand: YargsCommandDefinition = <T>({command, describe}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: describe || 'Create the config map and secret for a tool configured in the environment',
    builder: (yargs: Argv<any>) => yargs
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
      }),
    handler: async (argv: Arguments<ToolConfigOptions>) => {
      const toolsConfig: ToolsConfig = Container.get(ToolsConfig);

      await toolsConfig.configureTool(argv);
    }
  };
};
