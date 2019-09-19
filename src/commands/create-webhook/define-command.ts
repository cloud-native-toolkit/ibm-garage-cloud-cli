import {Arguments, Argv, CommandModule} from 'yargs';

import {CreateWebhookOptions} from './create-webhook-options.model';
import {buildOptionWithEnvDefault, DefaultOptionBuilder, YargsCommandDefinition} from '../../util/yargs-support';
import {CreateWebhook} from './create-webhook';
import {Container} from 'typescript-ioc';

export const defineCreateWebhookCommand: YargsCommandDefinition = <T>(commandName: string): CommandModule<T> => {
  return {
    command: commandName,
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
        const command: CreateWebhook = Container.get(CreateWebhook);
        const id = await command.createWebhook(argv);

        console.log(`Webhook created: ${id}`);
      } catch (err) {
        console.log('Error creating webhook', err);
        process.exit(1);
      }
    }
  };
};
