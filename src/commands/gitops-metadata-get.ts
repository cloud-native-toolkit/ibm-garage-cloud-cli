import {Container} from "typescript-ioc";
import {Arguments, Argv} from "yargs";
import * as YAML from 'js-yaml';

import {loadFromEnv} from "./gitops-init";
import {defaultAutoMerge, defaultRateLimit} from "./support/gitops-module-common";
import {
    GitopsMetadataApi,
    GitopsMetadataRetrieveInput,
    GitopsMetadataRetrieveResult,
    GitopsMetadataUpdateInput
} from "../services";
import {BaseGitConfig} from "../model";
import {Logger, verboseLoggerFactory} from "../util/logger";
import {gitopsUtil} from "../util/gitops-util";
import {dirname} from "path";
import {mkdirp} from "fs-extra";
import {promises} from "fs";

export interface GitopsMetadataRetrieveOptions {
    bootstrapRepoUrl?: string
    gitopsConfigFile?: string
    gitopsCredentialsFile?: string
    autoMerge?: boolean
    rateLimit?: boolean
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

export const command = 'gitops-metadata-get';
export const desc = 'Retrieves the cluster metadata including available operator packages from git repo';
export const builder = (yargs: Argv<any>) => {
    return yargs
        .options({
            'caCert': {
                type: 'string',
                description: 'Name of the file containing the ca certificate for SSL connections. The value can also be provided in the `GIT_CA_CERT` environment variable.',
                demandOption: false
            },
            'gitopsConfigFile': {
                describe: 'Name of yaml or json file that contains the gitops config values',
                type: 'string',
                conflicts: 'bootstrapRepoUrl',
                demandOption: false,
            },
            'bootstrapRepoUrl': {
                describe: 'Url of the bootstrap repo that contains the gitops config yaml. Value can also be provided with GIT_URL env variable',
                type: 'string',
                conflicts: 'gitopsConfigFile',
                demandOption: false,
            },
            'gitopsCredentialsFile': {
                describe: 'Name of yaml or json file that contains the gitops credentials',
                type: 'string',
                conflicts: 'token',
                demandOption: false,
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
            },
            'serverName': {
                describe: 'The name of the cluster. If not provided will use `default`',
                demandOption: false,
                default: 'default'
            },
            'lock': {
                describe: 'Git repo locking style',
                demandOption: false,
                choices: ['optimistic', 'pessimistic', 'branch', 'o', 'p', 'b'],
                default: process.env.LOCK || 'branch',
            },
            'autoMerge': {
                describe: 'Flag indicating that the branch/PR should be automatically merged. Only applies if lock strategy is branch',
                type: 'boolean',
                demandOption: false,
                default: defaultAutoMerge(),
            },
            'delete': {
                alias: 'd',
                describe: 'Flag indicating that the content should be deleted from the repo',
                type: 'boolean',
                demandOption: false,
                default: false,
            },
            'rateLimit': {
                describe: 'Flag indicating that the calls to the git api should be rate limited.',
                type: 'boolean',
                demandOption: false,
                default: defaultRateLimit(),
            },
            'waitForBlocked': {
                describe: 'The amount of time to wait for blocked pull requests. The format is "1h30m10s" or any combination.',
                type: 'string',
                default: '1h',
                demandOption: false
            },
            'tmpDir': {
                describe: 'The temp directory where the gitops repo should be checked out',
                type: 'string',
                default: '/tmp/gitops-metadata',
                demandOption: false,
            },
            'debug': {
                describe: 'Turn on debug logging',
                type: 'boolean',
                demandOption: false,
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

export const handler = async (argv: Arguments<GitopsMetadataRetrieveOptions & {debug: boolean, lock: string}>) => {
    process.env.VERBOSE_LOGGING = argv.debug ? 'true' : 'false';

    Container.bind(Logger).factory(verboseLoggerFactory(argv.debug));

    const logger: Logger = Container.get(Logger)

    const service: GitopsMetadataApi = Container.get(GitopsMetadataApi);

    try {
        const input: GitopsMetadataRetrieveInput = await processOptions(argv);

        const result: GitopsMetadataRetrieveResult = await service.get(input);

        const jsonfileRegex = /^jsonfile=?(.*)/
        switch (argv.output) {
            case 'text':
                console.log(YAML.dump(result.metadata))
                break
            case 'json':
                console.log(JSON.stringify(result.metadata, null, 2))
                break
            case 'yaml':
                console.log(YAML.dump(result.metadata))
                break
            default:
                if (jsonfileRegex.test(argv.output)) {
                    const outputContent: string = JSON.stringify(result.metadata, null, 2)

                    const match = jsonfileRegex.exec(argv.output)
                    const filename = (match && match[1] ? match[1] : './output.json')
                    const filepath = dirname(filename)

                    console.log(`  Writing gitops config to ${filename}`)

                    await mkdirp(filepath)
                    await promises.writeFile(filename, outputContent)
                } else {
                    console.log(YAML.dump(result.metadata))
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

const processOptions = async (options: GitopsMetadataRetrieveOptions): Promise<GitopsMetadataRetrieveInput> => {
    const gitConfig: BaseGitConfig = await gitopsUtil.defaultGitOpsInputs(options)

    return Object.assign(
        {},
        options,
        gitConfig
    ) as GitopsMetadataUpdateInput
}