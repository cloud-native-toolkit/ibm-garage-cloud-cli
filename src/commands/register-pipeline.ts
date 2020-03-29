import {Arguments, Argv} from 'yargs';
import {CommandLineOptions} from '../model';
import {DefaultOptionBuilder} from '../util/yargs-support';
import {RegisterJenkinsPipeline, RegisterPipeline, RegisterPipelineOptions} from '../services/register-pipeline';
import {checkKubeconfig} from '../util/kubernetes';
import {Container} from 'typescript-ioc';
import {RegisterTektonPipeline} from '../services/register-pipeline/register-tekton-pipeline';
import {ErrorSeverity, isCommandError} from '../util/errors';
import {isPipelineError, PipelineErrorType} from '../services/register-pipeline/register-pipeline';
import * as chalk from 'chalk';
import {QuestionBuilder} from '../util/question-builder';

export const command = 'pipeline';
export const desc = 'Register a pipeline for the current code repository';
export const builder = (yargs: Argv<any>) => new DefaultOptionBuilder<RegisterPipelineOptions>(yargs)
  .quiet()
  .debug()
  .build()
  .option('templateNamespace', {
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
  .option('tekton', {
    conflicts: 'jenkins',
    description: 'register a tekton pipeline',
    type: 'boolean',
  })
  .option('jenkins', {
    conflicts: 'tekton',
    description: 'register a jenkins pipeline',
    type: 'boolean',
  })
  .option('pipelineName', {
    description: 'the name of the Tekton pipeline to use',
    type: 'string',
  })
  .option('generateCrumb', {
    alias: 'c',
    description: 'flag indicating that a crumb is required to complete the registration',
    default: false,
  });
exports.handler = async (argv: Arguments<RegisterPipelineOptions & CommandLineOptions & {jenkins: boolean, tekton: boolean}>) => {
  let spinner;

  if (argv.debug) {
    console.log('Input values: ', argv);
  }

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

    if (!argv.jenkins && !argv.tekton) {
      const questionBuilder: QuestionBuilder<{pipelineType: 'jenkins' | 'tekton'}> = Container.get(QuestionBuilder);

      const {pipelineType} = await questionBuilder.question({
        type: 'list',
        name: 'pipelineType',
        message: 'Select the type of pipeline that should be run?',
        choices: [{
          name: 'Jenkins',
          value: 'jenkins'
        }, {
          name: 'Tekton',
          value: 'tekton'
        }]
      }).prompt();

      if (pipelineType === 'jenkins') {
        argv.jenkins = true;
      } else {
        argv.tekton = true;
      }
    }

    const command: RegisterPipeline = argv.tekton
      ? Container.get(RegisterTektonPipeline)
      : Container.get(RegisterJenkinsPipeline);

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
    } else if (isPipelineError(err)) {
      if (err.pipelineErrorType === PipelineErrorType.JENKINS_MISSING) {
        console.log(chalk.red('Jenkins has not been installed in this namespace'));
        console.log(`Install Jenkins by running ${chalk.yellow('igc namespace ' + argv.pipelineNamespace + ' --jenkins')}`)
        console.log();
      } else if (err.pipelineErrorType === PipelineErrorType.NAMESPACE_MISSING) {
        console.log(chalk.red('The target namespace does not exist'));

        const flag = argv.tekton ? ' --tekton' : ' --jenkins';
        console.log(`Create the namespace by running: ${chalk.yellow('igc namespace ' + argv.pipelineNamespace + flag)}`);
        console.log();
      }
    } else {
      console.log('Error registering pipeline:', err.message);
      if (argv.debug) {
        console.log('Error registering pipeline:', err);
      }
      process.exit(1);
    }
  }
};
