import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';

import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {CommandLineOptions} from '../../model';
import {getIngress} from './ingress';
import {checkKubeconfig} from '../../util/kubernetes';

export const defineIngressCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'list the current ingress hosts for deployed apps in a namespace',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
      .clusterNamespace({
        optional: false,
        describe: 'The cluster namespace where the apps are deployed',
        default: 'dev',
      })
      .quiet()
      .debug()
      .build()
      ,
    handler: async (argv: Arguments<{namespace: string; yaml: boolean} & CommandLineOptions>) => {
      let spinner;

      function statusCallback(status: string) {
        if (!spinner) {
          spinner = ora(status).start();
        } else {
          spinner.text = status;
        }
      }

      try {
        await checkKubeconfig();

        // Retrieve the results
        const result = await getIngress(argv.namespace, statusCallback);

        if (spinner) {
          spinner.stop();
        }
        console.log("Host(s):");
        console.log(result.map(element => {
          return "http://"+element;
        }));
        

        process.exit(0);
      } catch (err) {
        if (spinner) {
          spinner.stop();
        }

        console.log('Error getting credentials:', err.message);
        if (argv.debug) {
          console.log('Error getting credentials:', err);
        }
        process.exit(1);

      }
    }
  };
};
