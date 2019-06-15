import {Arguments, Argv, CommandModule} from 'yargs';
import {DeployOptions} from './deploy-options.model';
import {deployImage} from './deploy-image';
import {CommandLineOptions} from '../../model';
import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';

export const defineDeployImageCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'deploy an image from the IBM Cloud registry into a kubernetes cluster',
    builder: (argv: Argv<any>) => new DefaultOptionBuilder(argv)
      .baseOptions()
      .clusterName()
      .clusterNamespace()
      .chartRoot()
      .chartName()
      .build(),
    handler: async (argv: Arguments<DeployOptions & CommandLineOptions>) => {
      if (argv.debug) {
        console.log('arguments', argv);
      }

      try {
        const {stdout, stderr} = await deployImage(argv);

        if (!argv.quiet) {
          console.log(stdout);
          console.log(stderr);
        }
      } catch (error) {
        console.log('error', error);
        process.exit(1);
      }
    },
  };
};
