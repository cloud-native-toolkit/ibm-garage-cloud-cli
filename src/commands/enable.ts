import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';
import * as chalk from 'chalk';

import {CommandLineOptions} from '../model';
import {EnablePipeline, EnablePipelineModel, EnablePipelineResult} from '../services/enable';

export const command = 'enable';
export const desc = 'Enable the current repository with pipeline logic';
export const builder = (argv: Argv<any>) => argv
  .option('repo', {
    type: 'string',
    describe: 'The repository from which the pipelines will be retrieved',
    default: 'https://ibm-garage-cloud.github.io/garage-pipelines/',
  })
  .option('pipeline', {
    type: 'string',
    describe: 'The name of the pipeline to enable for the project',
    required: false
  });
exports.handler = async (argv: Arguments<EnablePipelineModel & CommandLineOptions>) => {
  const service: EnablePipeline = Container.get(EnablePipeline);

  console.log('Looking up pipelines from repository: ' + argv.repo);

  const result: EnablePipelineResult = await service.enable(argv);

  console.log('**Here\'s what happened**');
  console.log('');
  console.log('1. A listing of available pipelines was retrieved from ' + chalk.bgGreen(result.repository));
  console.log('2. You selected the ' + chalk.bgGreen(result.pipelineName) + ' pipeline');
  if (result.filesChanged.length > 0) {
    console.log('3. We added the following files to your repo:');
    result.filesChanged.forEach(file => {
      console.log('  - ' + chalk.bgGreen(file));
    });
    console.log('');
    console.log(chalk.bgYellow('Don\'t forget to commit the new files'));
  } else {
    console.log('');
    console.log('No files were changed in your repo');
  }
};
