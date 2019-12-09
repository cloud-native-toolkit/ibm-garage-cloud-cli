import {Container} from 'typescript-ioc';
import {Arguments, Argv, CommandModule, PositionalOptions} from 'yargs';
import * as open from 'open';

import {YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {KubeIngress} from '../../api/kubectl/ingress';
import ora from 'ora';
import {KubeConfigMap} from '../../api/kubectl';
import {GetDashboardUrl} from './get-dashboard-url';

export const defineDashboard: YargsCommandDefinition = <T>({command}: YargsCommandDefinitionArgs): CommandModule<T> => {

  return {
    command,
    describe: 'Open the dashboard url in the default browser',
    builder: (yargs: Argv<any>) => {
      return yargs;
    },
    handler: async (argv: Arguments<any>) => {
      const getDashboardUrl: GetDashboardUrl = Container.get(GetDashboardUrl);

      const spinner = ora('Looking up dashboard ingress').start();

      try {
        function statusCallback(status: string) {
          spinner.text = status;
        }

        const url: string = await getDashboardUrl.getUrl('tools');

        if (url) {
          spinner.stop();

          console.log('Opening dashboard: ' + url);
          await open(url);
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
