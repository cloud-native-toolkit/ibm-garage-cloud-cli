import {Container} from 'typescript-ioc';
import {Arguments, Argv} from 'yargs';

import {IterationZeroConfigApi, IterationZeroConfigModel} from '../services/iteration-zero-config';
import {LOG_CONFIG, LoggerApi, LogLevel} from '../logger';
import {CommandLineOptions} from '../model';

export const command = 'izero';
export const desc = 'Configure (and optionally deploy) the iteration zero assets';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .option('catalogUrl', {
      alias: 'u',
      default: 'https://ibm-garage-cloud.github.io/garage-terraform-modules/index.yaml'
    })
    .option('input', {
      alias: 'i',
      demandOption: false,
    })
    .option('ci', {
      type: 'boolean',
      demandOption: false,
    })
    .option('debug', {
      type: 'boolean',
      describe: 'Flag to turn on more detailed output message',
    });
};

export const handler = async (argv: Arguments<IterationZeroConfigModel & CommandLineOptions>) => {
  Container.bindName(LOG_CONFIG).to({
    logLevel: argv.debug ? LogLevel.DEBUG : LogLevel.INFO,
  });

  const cmd: IterationZeroConfigApi = Container.get(IterationZeroConfigApi);
  const logger: LoggerApi = Container.get(LoggerApi).child('izero');

  try {
    await cmd.buildConfig(argv);
  } catch (err) {
    logger.error('Error building config', {err})
  }
};
