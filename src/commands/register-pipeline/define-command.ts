import {Arguments, Argv, CommandModule} from 'yargs';

import {DefaultOptionBuilder, YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {CommandLineOptions} from '../../model';
import {checkKubeconfig} from '../../util/kubernetes';
import {ErrorSeverity, isCommandError} from '../../util/errors';
import {Container} from 'typescript-ioc';
import {RegisterPipeline} from './register-pipeline';

export const defineRegisterPipelineCommand: YargsCommandDefinition = <T>({command, aliases = []}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command,
    aliases,
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
      })
      .option('generateCrumb', {
        alias: 'c',
        description: 'flag indicating that a crumb is required to complete the registration',
        default: false,
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
        await checkKubeconfig();

        const command: RegisterPipeline = Container.get(RegisterPipeline);
        await command.registerPipeline(argv, statusCallback);

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
