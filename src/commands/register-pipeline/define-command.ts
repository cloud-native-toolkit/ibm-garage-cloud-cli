import {Arguments, Argv} from 'yargs';
import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {registerPipeline} from './register-pipeline';

export const defineRegisterPipelineCommand: YargsCommandDefinition = <T>(yargs: Argv<T>, command: string, description: string): Argv<T> => {
  yargs.command(
    command,
    description,
    (yargs: Argv<any>) => new DefaultOptionBuilder(yargs)
      .apiKey()
      .resourceGroup()
      .region()
      .clusterName()
      .clusterNamespace()
      .debug()
      .quiet()
      .build(),
    async (argv: Arguments<RegisterPipelineOptions>) => {
      await registerPipeline(argv);
    });

  return yargs;
};
