import {Arguments, Argv} from 'yargs';
import {CommandLineOptions} from '../model';
import {EnableModel} from '../services/enable/enable.model';
import {EnablePipeline} from '../services/enable/enable';
import {Container} from 'typescript-ioc';

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
exports.handler = async (argv: Arguments<EnableModel & CommandLineOptions>) => {
  const service: EnablePipeline = Container.get(EnablePipeline);

  return service.enable(argv);
};
