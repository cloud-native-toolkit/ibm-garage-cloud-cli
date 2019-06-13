import {YargsCommandDefinition} from '../../util/yargs-support';
import {Arguments, Argv} from 'yargs';
import {generateToken, GenerateTokenOptions} from '../generate-token';

export const defineGenerateTokenCommand: YargsCommandDefinition = <T>(yargs: Argv<T>, command: string, description: string) => {
  yargs.command(
    command,
    description,
    (yargs: Argv<any>) => {
      return yargs
        .options('url', {
          description: 'The url to the Jenkins server',
          required: true
        })
        .options('username', {
          description: 'The username of the user for whom the api token will be generated',
          default: 'admin',
          alias: 'u'
        })
        .options('password', {
          description: 'The password of the user',
          required: true,
          alias: 'p'
        })
        .options('yaml', {
          description: 'Output values as yaml'
        });
    },
    async (argv: Arguments<GenerateTokenOptions>) => {
      const apiToken = await generateToken(argv);

      if (argv.yaml) {
        const yamlBase = typeof argv.yaml === 'string' ? argv.yaml : 'jenkins';

        console.log(`${yamlBase}:`);
        console.log(`    url: "${argv.url}"`);
        console.log(`    username: "${argv.username}"`);
        console.log(`    password: "${argv.password}"`);
        console.log(`    api_token: "${apiToken}"`);
      } else {
        console.log(apiToken);
      }
    });

  return yargs;
};
