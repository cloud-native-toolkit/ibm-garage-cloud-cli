import {Arguments, Argv, CommandModule} from 'yargs';
import * as ora from 'ora';

import {ibmcloudLogin} from './ibmcloud-login';
import {IbmCloudLogin} from './ibmcloud-login.model';
import {CommandLineOptions} from '../../model';
import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';

export const defineLoginCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: 'Log in using the ibmcloud cli, optionally configure the cluster, and optionally runs a command',
    builder: (argv: Argv<any>) => new DefaultOptionBuilder(argv)
      .apiKey({optional: true})
      .region()
      .resourceGroup()
      .clusterName({optional: true})
      .debug()
      .build()
      .option('sso', {
        type: 'boolean',
        describe: 'log in using sso'
      }),
    handler: async (argv: Arguments<IbmCloudLogin & CommandLineOptions>) => {
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
    },
  };
};
