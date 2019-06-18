import {Arguments, Argv, CommandModule} from 'yargs';

import createWebhook from './create-webhook';
import {CreateWebhookOptions} from './create-webhook-options.model';
import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';

export const defineCreateWebhookCommand: YargsCommandDefinition = <T>(command: string): CommandModule<T> => {
  return {
    command,
    describe: 'create git webhook for Jenkins pipeline',
    builder: (yargs: Argv<any>) => yargs
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
      })),
    handler: async (argv: Arguments<CreateWebhookOptions>) => {
      try {
        const id = await createWebhook(argv);

        console.log(`Webhook created: ${id}`);
      } catch (err) {
        console.log('Error creating webhook', err);
        process.exit(1);
      }
    }
  };
};
