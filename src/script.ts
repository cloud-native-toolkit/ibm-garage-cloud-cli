#!/usr/bin/env node

import {scriptName} from 'yargs';

import {defineBuildImageCommand} from './commands/build-image/define-command';
import {defineDeployImageCommand} from './commands/deploy-image/define-command';
import {defineRegisterPipelineCommand} from './commands/register-pipeline/define-command';
import {defineLaunchToolsCommand} from './commands/launch-tools/define-command';

scriptName('igc')
  .usage('$0 <cmd> [args]')
  .command(defineRegisterPipelineCommand(
    'register',
  ))
  .command(defineBuildImageCommand(
    'build',
  ))
  .command(defineDeployImageCommand(
    'deploy',
  ))
  .command(defineLaunchToolsCommand(
    'tools'
  ))
  .demandCommand()
  .help()
  .argv;
