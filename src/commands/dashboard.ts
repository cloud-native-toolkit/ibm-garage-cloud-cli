import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import ora = require('ora');
import * as open from 'open';
import {GetDashboardUrl} from '../services/dashboard';

export const command = 'dashboard';
export const desc = 'Open the Developer Dashboard in the default browser';
export const builder = (yargs: Argv<any>) => {
    return yargs.option('namespace', {
      alias: 'n',
      describe: 'the namespace where the Dashboard has been deployed',
      default: 'tools'
    });
  };
exports.handler = async (argv: Arguments<{namespace: string}>) => {
  const getDashboardUrl: GetDashboardUrl = Container.get(GetDashboardUrl);

  const spinner = ora('Looking up Dashboard').start();

  try {
    function statusCallback(status: string) {
      spinner.text = status;
    }

    const url: string = await getDashboardUrl.getUrl(argv.namespace);

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
};