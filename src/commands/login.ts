import {Arguments, Argv} from 'yargs';

import {buildImage, BuildOptions} from '../services/build-image';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {ibmcloudLogin, IbmCloudLogin} from '../services/login';

export const command = 'login';
export const desc = 'Log in using the ibmcloud cli, optionally configure the cluster, and optionally runs a command';
export const builder = (argv: Argv<any>) => new DefaultOptionBuilder(argv)
  .apiKey({optional: true})
  .region()
  .resourceGroup()
  .clusterName({optional: true})
  .debug()
  .build()
  .option('sso', {
    type: 'boolean',
    describe: 'log in using sso'
  });
exports.handler = async (argv: Arguments<IbmCloudLogin & CommandLineOptions>) => {
  if (argv.debug) {
    console.log('arguments', argv);
  }

  try {
    const result: {kubeConfig: string} = await ibmcloudLogin(argv);

    console.log(`export KUBECONFIG=${result.kubeConfig}`);
  } catch (error) {
    console.log('error', error);
    process.exit(1);
  }
};
