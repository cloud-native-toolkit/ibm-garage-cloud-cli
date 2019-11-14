import {YargsCommandDefinition, YargsCommandDefinitionArgs} from '../../util/yargs-support';
import {Arguments, Argv, CommandModule} from 'yargs';
import {CreateGitSecret, CreateGitSecretOptions} from './create-git-secret';
import {Container} from 'typescript-ioc';
import {stringToStringArray} from '../../util/string-util';
import ora = require('ora');

export const defineGitSecretCommand: YargsCommandDefinition = <T>({command, aliases = []}: YargsCommandDefinitionArgs): CommandModule<T> => {
  return {
    command: `${command} [name]`,
    describe: 'Create a kubernetes secret that contains the url, username, and personal access token for a git repo',
    builder: (yargs: Argv<any>) => {
      return yargs
        .option('namespaces', {
          alias: 'n',
          type: 'string',
          describe: 'Namespace(s) where the secret should be created. multiple values. Multiple values should be separated by a comma (e.g. dev,test)',
          require: true,
        })
        .option('values', {
          describe: 'Values file yaml that contains additional attributes to add to the secret',
          type: 'string',
          require: false,
        })
        .option('workingDir', {
          alias: 'd',
          describe: 'Directory where the repository is stored',
          type: 'string',
          require: false,
        })
        .option('gitUsername', {
          alias: 'u',
          describe: 'Git username for the current repository',
          type: 'string',
          require: false,
        })
        .option('gitPat', {
          alias: 'p',
          describe: 'Git personal access token for the current repository',
          require: false,
        })
        .positional('name', {
          describe: 'Name of the secret that will be created. the value will default to {git org}.{git repo} it not provided',
          require: false,
        });
    },
    handler: async (argv: Arguments<CreateGitSecretOptions>) => {
      const cmd: CreateGitSecret = Container.get(CreateGitSecret);
      let spinner;

      function statusCallback(status: string) {
        // if (!spinner) {
        //   spinner = ora(status).start();
        // } else {
        //   spinner.text = status;
        // }

        console.log(status);
      }

      try {
        await cmd.getParametersAndCreateSecret(
          Object.assign(
            {},
            argv,
            {
              namespaces: stringToStringArray(argv.namespaces),
            }
          ),
          statusCallback,
        );
      } finally {
        if (spinner) {
          spinner.stop();
        }
      }
    }
  }
};
