import {Container} from 'typescript-ioc';
import {Arguments, Argv, CommandModule, PositionalOptions} from 'yargs';
import * as open from 'open';

import {YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {KubeIngress} from '../../api/kubectl/ingress';
import ora from 'ora';

export const defineDashboard: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {

  return {
    command,
    describe: 'Open the dashboard url in the default browser',
    builder: (yargs: Argv<any>) => {
      return yargs;
    },
    handler: async (argv: Arguments<any>) => {
      const kubeIngress: KubeIngress = Container.get(KubeIngress);

      const spinner = ora('Looking up dashboard ingress').start();

      try {
        function statusCallback(status: string) {
          spinner.text = status;
        }

        const urls: string[] = await kubeIngress.getUrls('tools', 'catalyst-dashboard');

        if (urls.length > 0) {
          spinner.stop();

          console.log('Opening dashboard: ' + urls[0]);
          await open(urls[0]);
        }
      } catch (err) {
        spinner.stop();
        console.log('Error getting dashboard ingress.\n  Make sure the kubernetes environment has been initialized.\n');
        process.exit(1);
      } finally {
        spinner.stop();
      }
    },
  }
};
