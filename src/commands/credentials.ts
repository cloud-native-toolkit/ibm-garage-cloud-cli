import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import ora from 'ora';
import {safeDump as safeDumpYaml} from 'js-yaml';

import {CommandLineOptions} from '../model';
import {Credentials} from '../services/credentials';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {checkKubeconfig} from '../util/kubernetes';

export const command = 'credentials';
export const desc = 'Lists the urls and credentials for the tools deployed to the cluster';
export const builder = (yargs: Argv<any>) => new DefaultOptionBuilder<any>(yargs)
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
  });
exports.handler = async (argv: Arguments<{namespace: string; yaml: boolean} & CommandLineOptions>) => {
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
      console.log(safeDumpYaml(result));
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
};
