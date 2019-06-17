#!/usr/bin/env node

import {scriptName} from 'yargs';

import {defineBuildImageCommand} from './commands/build-image/define-command';
import {defineDeployImageCommand} from './commands/deploy-image/define-command';
import {defineRegisterPipelineCommand} from './commands/register-pipeline/define-command';
import {defineLaunchToolsCommand} from './commands/launch-tools/define-command';

scriptName('igc')
  .usage('IBM Garage Cloud cli')
  .usage('')
  .usage('Usage: $0 <command> [args]')
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
