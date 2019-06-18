import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';

import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {registerPipeline} from './register-pipeline';

export const defineRegisterPipelineCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'register the pipeline in Jenkins for the repo',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<RegisterPipelineOptions>(yargs)
      .clusterNamespace({
        optional: true,
        describe: 'The cluster namespace where Jenkins is running',
        default: 'tools',
      })
      .quiet()
      .build()
      .option('skipWebhook', {
        type: 'boolean',
        describe: 'flag indicating that the webhook should not be created'
      }),
    handler: async (argv: Arguments<RegisterPipelineOptions>) => {
      let spinner;

      function statusCallback(status: string) {
        if (!spinner) {
          spinner = ora(status).start();
        } else {
          spinner.text = status;
        }
      }

      try {
        await registerPipeline(argv, statusCallback);

        process.exit(0);
      } catch (err) {
        console.log('Error registering pipeline', err);
        process.exit(1);
      } finally {
        if (spinner) {
          spinner.stop();
        }
      }
    }
  };
};
