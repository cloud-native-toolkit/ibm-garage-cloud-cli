import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';
import * as YAML from 'json2yaml';

import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {CommandLineOptions} from '../../model';
import {Credentials} from './credentials';
import {checkKubeconfig} from '../../util/kubernetes';
import {Container} from 'typescript-ioc';

export const defineCredentialsCommand: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    describe: 'Lists the urls and credentials for the tools deployed to the cluster',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
      .clusterNamespace({
        optional: true,
        describe: 'The cluster namespace where the credentials are stored',
        default: 'tools',
      })
      .quiet()
      .debug()
      .build()
      .option('yaml', {
        type: 'boolean',
        describe: 'print the result in yaml format'
      }),
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

        const command: Credentials = Container.get(Credentials);
        const result = await command.getCredentials(argv.namespace, statusCallback);

        if (spinner) {
          spinner.stop();
        }

        if (argv.yaml) {
          console.log('Credentials:');
          console.log(YAML.stringify(result));
        } else {
          console.log('Credentials: ', result);
        }

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
