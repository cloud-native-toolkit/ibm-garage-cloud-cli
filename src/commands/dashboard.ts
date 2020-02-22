import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import ora = require('ora');
import {GetDashboardUrl} from '../services/dashboard/get-dashboard-url';
import * as open from 'open';

export const command = 'dashboard';
export const desc = 'Open the dashboard url in the default browser';
export const builder = (yargs: Argv<any>) => {
    return yargs;
  };
exports.handler = async (argv: Arguments<any>) => {
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
};