#!/usr/bin/env node

import {scriptName} from 'yargs';

import {defineBuildImageCommand} from './commands/build-image/define-command';
import {defineDeployImageCommand} from './commands/deploy-image/define-command';
import {defineGenerateTokenCommand} from './commands/generate-token/define-command';
import {defineRegisterPipelineCommand} from './commands/register-pipeline/define-command';
import {defineLaunchToolsCommand} from './commands/launch-tools/define-command';
import {defineGetVlanCommand} from './commands/vlan/define-command';
import {defineJenkinsAuth} from './commands/jenkins-auth/define-command';
import {defineCreateWebhookCommand} from './commands/create-webhook/define-command';
import {defineCredentialsCommand} from './commands/credentials/define-command';
import {defineIngressCommand} from './commands/ingress/define-command';
import {defineToolConfigCommand} from './commands/tool-config/define-command';
import {defineNamespace} from './commands/namespace/define-command';
import {defineDashboard} from './commands/dashboard/define-command';

scriptName('igc')
  .usage('IBM Garage Cloud CLI')
  .usage('')
  .usage('Usage: $0 <command> [args]')
  .command(defineJenkinsAuth({
    command: 'jenkins-auth',
  }))
  .command(defineGenerateTokenCommand({
    command: 'gen-token'
  }))
  .command(defineRegisterPipelineCommand({
    command: 'pipeline',
    aliases: ['register'],
  }))
  .command(defineCreateWebhookCommand({
    command: 'git-webhook',
  }))
  .command(defineDashboard({
    command: 'dashboard',
  }))
  .command(defineBuildImageCommand({
    command: 'build',
  }))
  .command(defineDeployImageCommand({
    command: 'deploy',
  }))
  .command(defineLaunchToolsCommand({
    command: 'tools',
  }))
  .command(defineGetVlanCommand({
    command: 'vlan',
  }))
  .command(defineCredentialsCommand({
    command: 'credentials',
  }))
  .command(defineIngressCommand({
    command: 'ingress',
  }))
  .command(defineToolConfigCommand({
    command: 'tool-config',
  }))
  .command(defineNamespace({
    command: 'namespace',
  }))
  .demandCommand()
  .help()
  .argv;
