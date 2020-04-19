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
    alias: 'p',
    type: 'string',
    describe: 'The name of the pipeline to enable for the project',
    required: false
  })
  .option('release', {
    alias: 'r',
    type: 'string',
    describe: 'The release version of the pipeline to enable for the project',
    default: 'latest'
  })
  .option('branch', {
    alias: 'b',
    type: 'string',
    describe: 'The branch for the pipeline (e.g. stable)',
    default: 'stable'
  });
exports.handler = async (argv: Arguments<EnablePipelineModel & CommandLineOptions>) => {
  const service: EnablePipeline = Container.get(EnablePipeline);

  console.log('Looking up pipelines from repository: ' + argv.repo);

  try {
    const result: EnablePipelineResult = await service.enable(argv);

    console.log('**Here\'s what happened**');
    console.log('');
    console.log('1. A listing of available pipelines was retrieved from ' + chalk.green(result.repository));
    console.log(`2. You selected the ${chalk.green(result.branch + '/' + result.pipeline.name + '@' + result.pipeline.version)} pipeline`);
    if (result.filesChanged.length > 0) {
      console.log('3. We added the following files to your repo:');
      result.filesChanged.forEach(file => {
        console.log('  - ' + chalk.green(file));
      });
      console.log('');
      console.log(chalk.yellow('Don\'t forget to commit the new files'));
    } else {
      console.log('');
      console.log('No files were changed in your repo');
    }
  } catch (err) {
    if (err.versions) {
      console.log(err.message);
      console.log('These versions were found' + err.versions);
    } else {
      console.log(err.message);
    }
  }
};
