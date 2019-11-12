import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';
import {BuildOptions} from './build-options.model';
import {CommandLineOptions} from '../../model';
import {buildImage} from './build-image';

export const defineBuildImageCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: 'Build the image and push it into the IBM Cloud registry',
    builder: (argv: Argv<any>) => new DefaultOptionBuilder(argv).baseOptions().build(),
    handler: async (argv: Arguments<BuildOptions & CommandLineOptions>) => {
      if (argv.debug) {
        console.log('arguments', argv);
      }

      try {
        const {stdout, stderr} = await buildImage(argv);

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
