#!/usr/bin/env node

import {scriptName} from 'yargs';

import {defineBuildImageCommand} from './commands/build-image/define-command';
import {defineDeployImageCommand} from './commands/deploy-image/define-command';
import {defineRegisterPipelineCommand} from './commands/register-pipeline/define-command';

scriptName('igc')
  .usage('$0 <cmd> [args]')
  .command(defineRegisterPipelineCommand(
    'register',
    'register the pipeline in Jenkins for the repo',
  ))
  .command(defineBuildImageCommand(
    'build [args]',
    'build the image and push it into the IBM Cloud registry',
  ))
  .command(defineDeployImageCommand(
    'deploy [args]',
    'deploy an image from the IBM Cloud registry into a kubernetes cluster',
  ))
  .demandCommand()
  .help()
  .argv;
