import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';

export const command = 'build';
export const desc = 'Build the image and push it into the IBM Cloud registry';
export const builder = (argv: Argv<any>) => new DefaultOptionBuilder(argv).baseOptions().build();
exports.handler = async (argv: Arguments<BuildOptions & CommandLineOptions>) => {
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
};
