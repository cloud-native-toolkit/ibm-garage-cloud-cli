import {Arguments, Argv} from 'yargs';
import {Container} from 'typescript-ioc';

import {CreateWebhook, CreateWebhookOptions} from '../services/create-webhook';
import {buildOptionWithEnvDefault} from '../util/yargs-support';

export const command = 'create-webhook';
export const desc = 'Create a git webhook for a given Jenkins pipeline';
export const builder = (yargs: Argv<any>) => yargs
    .options(buildOptionWithEnvDefault('JENKINS_URL', {
      alias: 'jenkinsUrl',
      describe: 'The Jenkins host url',
      required: true,
      type: 'string',
    }))
    .options(buildOptionWithEnvDefault('USER_NAME', {
      alias: 'gitUsername',
      describe: 'The username for git',
      required: true,
      type: 'string',
    }))
    .options(buildOptionWithEnvDefault('API_TOKEN', {
      alias: 'gitToken',
      describe: 'The personal access token for git',
      required: true,
      type: 'string',
    }))
    .options(buildOptionWithEnvDefault('GIT_URL', {
      alias: 'gitUrl',
      describe: 'The url for the git repo',
      required: true,
      type: 'string',
    }));
exports.handler = async (argv: Arguments<CreateWebhookOptions>) => {
  try {
    const command: CreateWebhook = Container.get(CreateWebhook);
    const id = await command.createWebhook(argv);

    console.log(`Webhook created: ${id}`);
  } catch (err) {
    console.log('Error creating webhook', err);
    process.exit(1);
  }
};
