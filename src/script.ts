#!/usr/bin/env node

import {scriptName} from 'yargs';

import {defineBuildImageCommand} from './commands/build-image/define-command';
import {defineRegisterPipelineCommand} from './commands/register-pipeline/define-command';
import {defineDeployImageCommand} from './commands/deploy-image/define-command';

const yargs = scriptName('igc').usage('$0 <cmd> [args]');

defineBuildImageCommand(
  yargs,
  'gen-token',
  'generate a Jenkins api token',
);

defineRegisterPipelineCommand(
  yargs,
  'register',
  'register the pipeline in Jenkins for the repo',
);

defineBuildImageCommand(
  yargs,
  'build [args]',
  'build the image and push it into the IBM Cloud registry',
);

defineDeployImageCommand(
  yargs,
  'deploy [args]',
  'deploy an image from the IBM Cloud registry into a kubernetes cluster',
);

yargs
  .demandCommand()
  .help()
  .argv;
