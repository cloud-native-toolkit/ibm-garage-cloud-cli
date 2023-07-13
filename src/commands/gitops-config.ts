import {Container} from "typescript-ioc";
import {Arguments, Argv} from "yargs";
import * as YAML from 'js-yaml';
import {dirname} from "path";
import {mkdirp} from "fs-extra";
import {promises} from "fs";

import {loadFromEnv} from "./gitops-init";
import {BaseGitConfig} from "../model";
import {Logger, verboseLoggerFactory} from "../util/logger";
import {gitopsUtil} from "../util/gitops-util";

export interface GitopsConfigRetrieveOptions {
    bootstrapRepoUrl: string
    username?: string
    token?: string
    delete?: boolean
    waitForBlocked?: string
    caCert?: string | {cert: string, certFile: string}

    branch?: string
    serverName?: string
    tmpDir: string

    output: 'text' | 'json' | 'yaml'
}

export const command = 'gitops-config [bootstrapRepoUrl]';
export const desc = 'Retrieves the gitops config from provided bootstrap git repo';
export const builder = (yargs: Argv<any>) => {
    return yargs
        .positional('bootstrapRepoUrl', {
            description: 'Url of the bootstrap repo that contains the gitops config yaml. Value can also be provided with GIT_URL env variable',
            type: 'string',
            demandOption: false,
        })
        .options({
            'caCert': {
                type: 'string',
                description: 'Name of the file containing the ca certificate for SSL connections. The value can also be provided in the `GIT_CA_CERT` environment variable.',
                demandOption: false
            },
            'username': {
                describe: 'Git username to access gitops repo. Value can also be provided with GIT_USERNAME env variable',
                type: 'string',
                conflicts: 'gitopsCredentialsFile',
                demandOption: false,
            },
            'token': {
                describe: 'Git personal access token to access gitops repo. Value can also be provided with GIT_TOKEN env variable',
                type: 'string',
                conflicts: 'gitopsCredentialsFile',
                demandOption: false,
            },
            'branch': {
                describe: 'The branch where the payload has been deployed',
                demandOption: false,
                default: 'main'
            },
            'output': {
                describe: 'Output type',
                alias: ['o'],
                description: 'The format for result output (text, json, yaml, jsonfile)',
                type: 'string',
                default: 'text',
                demandOption: false,
            }
        })
        .middleware(loadFromEnv('username', 'GIT_USERNAME'), true)
        .middleware(loadFromEnv('token', 'GIT_TOKEN'), true)
        .middleware(loadFromEnv('bootstrapRepoUrl', 'GIT_URL'), true)
};

export const handler = async (argv: Arguments<GitopsConfigRetrieveOptions & {debug: boolean, lock: string}>) => {
    process.env.VERBOSE_LOGGING = argv.debug ? 'true' : 'false';

    Container.bind(Logger).factory(verboseLoggerFactory(argv.debug));

    const logger: Logger = Container.get(Logger)

    try {
        const gitConfig: BaseGitConfig = await gitopsUtil.defaultGitOpsInputs(argv)

        const result = Object.assign({}, gitConfig.gitopsConfig, {kubesealCert: gitConfig.kubesealCert})

        const jsonfileRegex = /^jsonfile=?(.*)/
        switch (argv.output) {
            case 'text':
                console.log(YAML.dump(result))
                break
            case 'json':
                console.log(JSON.stringify(result, null, 2))
                break
            case 'yaml':
                console.log(YAML.dump(result))
                break
            default:
                if (jsonfileRegex.test(argv.output)) {
                    const outputContent: string = JSON.stringify(result, null, 2)

                    const match = jsonfileRegex.exec(argv.output)
                    const filename = (match && match[1] ? match[1] : './output.json')
                    const filepath = dirname(filename)

                    console.log(`  Writing gitops config to ${filename}`)

                    await mkdirp(filepath)
                    await promises.writeFile(filename, outputContent)
                } else {
                    console.log(YAML.dump(result))
                }
        }
    } catch (err) {
        if (argv.debug) {
            console.error(err.message, err)
        } else {
            console.error(err.message)
        }

        process.exit(1)
    }
};
