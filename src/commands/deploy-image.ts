import {Arguments, Argv} from 'yargs';

import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {deployImage, DeployOptions} from '../services/deploy-image';

export const command = 'deploy';
export const desc = 'Deploy an image from the IBM Cloud registry into a kubernetes cluster';
export const builder = (argv: Argv<any>) => new DefaultOptionBuilder(argv)
  .baseOptions()
  .clusterName()
  .clusterNamespace()
  .chartRoot()
  .chartName()
  .build();
exports.handler = async (argv: Arguments<DeployOptions & CommandLineOptions>) => {
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
};
