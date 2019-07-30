import {Arguments, Argv, CommandModule} from 'yargs';
import ora from 'ora';

import {DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {registerPipeline} from './register-pipeline';
import {CommandLineOptions} from '../../model';
import {checkKubeconfig} from '../../util/kubernetes';
import {ErrorSeverity, isCommandError} from '../../util/errors';

export const defineRegisterPipelineCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'register the pipeline in Jenkins for the repo',
    builder: (yargs: Argv<any>) => new DefaultOptionBuilder<RegisterPipelineOptions>(yargs)
      .quiet()
      .debug()
      .build()
      .option('jenkinsNamespace', {
        type: 'string',
        alias: 'j',
        describe: 'the namespace where Jenkins is running',
      })
      .option('pipelineNamespace', {
        type: 'string',
        alias: 'n',
        describe: 'the namespace where the pipeline should be deployed',
      })
      .option('skipWebhook', {
        type: 'boolean',
        describe: 'flag indicating that the webhook should not be created'
      })
      .option('gitUsername', {
        alias: 'u',
        description: 'username used to access the git repository'
      })
      .option('gitPat', {
        alias: 'p',
        description: 'the token used to authenticate the user'
      })
      .option('values', {
        description: 'optional file with additional values to add to the secret'
      }),
    handler: async (argv: Arguments<RegisterPipelineOptions & CommandLineOptions>) => {
      let spinner;

      function statusCallback(status: string) {
        // if (!spinner) {
        //   spinner = ora(status).start();
        // } else {
        //   spinner.text = status;
        // }
        console.log(status);
      }

      try {
        await registerPipeline(argv, statusCallback);

        if (spinner) {
          spinner.stop();
        }

        process.exit(0);
      } catch (err) {
        if (spinner) {
          spinner.stop();
        }

        if (isCommandError(err)) {
          if (err.type.severity === ErrorSeverity.WARNING) {
            console.log(`Warning: ${err.message}`);
            process.exit(0)
          } else {
            console.log(`${err.type.severity}: ${err.message}`);
            process.exit(1);
          }
        } else {
          console.log('Error registering pipeline:', err.message);
          if (argv.debug) {
            console.log('Error registering pipeline:', err);
          }
          process.exit(1);
        }
      }
    }
  };
};
