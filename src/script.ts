#!/usr/bin/env node

import {CommandModule, scriptName} from 'yargs';

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


const yarg = scriptName('igc')
  .usage('IBM Garage Cloud CLI')
  .usage('')
  .usage('Usage: $0 <command> [args]')
  .demandCommand();

const commands: Array<CommandModule | undefined> = [
  defineJenkinsAuth({
    command: 'jenkins-auth',
  }),
  defineGenerateTokenCommand({
    command: 'gen-token'
  }),
  defineRegisterPipelineCommand({
    command: 'pipeline',
    aliases: ['register'],
  }),
  defineCreateWebhookCommand({
    command: 'git-webhook',
  }),
  defineDashboard({
    command: 'dashboard',
  }),
  defineBuildImageCommand({
    command: 'build',
  }),
  defineDeployImageCommand({
    command: 'deploy',
  }),
  defineLaunchToolsCommand({
    command: 'tools',
  }),
  defineGetVlanCommand({
    command: 'vlan',
  }),
  defineCredentialsCommand({
    command: 'credentials',
  }),
  defineIngressCommand({
    command: 'ingress',
  }),
  defineToolConfigCommand({
    command: 'tool-config',
  }),
  defineNamespace({
    command: 'namespace',
  }),
];
commands
  .filter(command => !!command)
  .forEach(command => yarg.command(command));

yarg.help()
  .argv;
