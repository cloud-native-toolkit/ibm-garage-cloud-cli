
import {apiFromUrl, GitApi} from "@cloudnativetoolkit/git-client";
import _ from "lodash";
import {SimpleGit} from "simple-git";
import {Container} from "typescript-ioc";

import first from "./first";
import {Logger} from "./logger";
import {parseFile, parsers, parseString} from "./string-util";
import {
    BaseGitConfig,
    GitOpsConfig,
    GitopsConfigEntry, GitOpsCredential,
    GitOpsCredentials,
    isGitopsConfig,
    isGitopsConfigEntry, PayloadConfig
} from "../model";

export interface GitApiInput {
    gitopsCredentials: GitOpsCredentials
    caCert?: {cert: string, certFile: string} | string
}

export class GitopsUtil {

    readonly logger: Logger

    constructor() {
        this.logger = Container.get(Logger)
    }

    async loadGitApi(input: GitApiInput, config: PayloadConfig): Promise<GitApi> {
        const credentials: GitOpsCredential = this.lookupGitCredential(input.gitopsCredentials, config.repo)

        return apiFromUrl(config.url, {username: credentials.username, password: credentials.token, caCert: input.caCert});
    }

    lookupGitCredential(credentials: GitOpsCredentials, repo: string): GitOpsCredential {
        const filteredCredentials: GitOpsCredential[] = credentials
            .filter(c => c.repo === repo || c.url === repo || c.repo === '*')
            .sort((a: GitOpsCredential, b: GitOpsCredential) => {
                return a.repo === '*' ? 1 : (b.repo === '*' ? -1 : a.repo.localeCompare(b.repo));
            });

        const credential: GitOpsCredential | undefined = first(filteredCredentials);

        if (!credential) {
            throw new Error('Git credentials not found for repo: ' + repo);
        }

        return credential;
    }

    async addCommitPushBranch(git: SimpleGit, message: string, branch: string): Promise<boolean> {
        const status: any = await git.status()
        if (status.not_added.length === 0 && status.deleted.length === 0 && status.conflicted.length === 0 && status.staged.length === 0 && status.modified.length === 0) {
            return false
        }

        this.logger.debug(`  ** Adding and committing changes to repo`);
        await git.add('.');
        await git.commit(message);

        this.logger.debug(`  ** Pushing changes`);
        await git.push('origin', branch).then(() => true).catch(() => false);

        return true
    }

    async defaultGitOpsInputs(options: {gitopsCredentialsFile?: string, username?: string, token?: string, bootstrapRepoUrl?: string, gitopsConfigFile?: string, branch?: string, caCert?: string | {cert: string, certFile: string}}): Promise<BaseGitConfig> {
        const gitopsCredentials: GitOpsCredentials = await this.loadGitOpsCredentials(options);

        const optionsWithCredentials = Object.assign({}, options, {gitopsCredentials});

        const gitopsConfig: GitOpsConfig = await this.loadGitOpsConfig(optionsWithCredentials);
        const kubesealCert: string = await this.loadKubesealCert(optionsWithCredentials);

        return {
            gitopsConfig,
            gitopsCredentials,
            branch: options.branch,
            caCert: options.caCert,
            kubesealCert,
        }
    }

    async loadGitOpsConfig({bootstrapRepoUrl, gitopsConfigFile, caCert, branch, gitopsCredentials}: {bootstrapRepoUrl?: string, gitopsConfigFile?: string, branch?: string, caCert?: string | {cert: string, certFile: string}, gitopsCredentials: GitOpsCredentials}): Promise<GitOpsConfig> {
        if (!gitopsConfigFile && !bootstrapRepoUrl && !process.env.GITOPS_CONFIG) {
            throw new Error('Missing gitops config file name, bootstrap repo location, or GITOPS_CONFIG env variable');
        }

        let gitopsConfig: GitOpsConfig | GitopsConfigEntry[];
        if (gitopsConfigFile) {
            gitopsConfig = await parseFile(gitopsConfigFile);
        } else if (process.env.GITOPS_CONFIG) {
            gitopsConfig = await parseString<GitOpsConfig | GitopsConfigEntry[]>(process.env.GITOPS_CONFIG);
        } else {
            const credential: GitOpsCredential = gitopsUtil.lookupGitCredential(gitopsCredentials, bootstrapRepoUrl);

            gitopsConfig = await parseGitFile(bootstrapRepoUrl, 'config.yaml', {username: credential.username, password: credential.token, caCert}, branch) as GitOpsConfig;
        }

        return gitopsConfigEntriesToGitopsConfig(gitopsConfig);
    }

    async loadKubesealCert({bootstrapRepoUrl, gitopsConfigFile, caCert, branch, gitopsCredentials}: {bootstrapRepoUrl?: string, gitopsConfigFile?: string, branch?: string, caCert?: string | {cert: string, certFile: string}, gitopsCredentials: GitOpsCredentials}): Promise<string> {
        if (!gitopsConfigFile && !bootstrapRepoUrl && !process.env.GITOPS_CONFIG) {
            return '';
        }

        const credential: GitOpsCredential = gitopsUtil.lookupGitCredential(gitopsCredentials, bootstrapRepoUrl);

        return parseGitFile<string>(bootstrapRepoUrl, 'kubeseal_cert.pem', {username: credential.username, password: credential.token, caCert}, branch).catch(() => '');
    }

    async loadGitOpsCredentials({gitopsCredentialsFile, username = 'username', token}: {gitopsCredentialsFile?: string, username?: string, token?: string}): Promise<GitOpsCredentials> {
        if (!gitopsCredentialsFile && !token && !process.env.GIT_CREDENTIALS) {
            throw new Error('Missing gitops credentials file and token');
        }

        if (gitopsCredentialsFile) {
            return await parseFile(gitopsCredentialsFile);
        } else if (process.env.GIT_CREDENTIALS) {
            return await parseString(process.env.GIT_CREDENTIALS);
        } else {
            return [{
                repo: '*',
                username,
                url: '*',
                token,
            }];
        }
    }

    lookupGitToken(credentials: GitOpsCredentials, repo: string): string {
        const credential: GitOpsCredential = this.lookupGitCredential(credentials, repo);

        if (credential.username) {
            return `${credential.username}:${credential.token}`;
        }

        return credential.token;
    }
}

export const gitopsConfigEntriesToGitopsConfig = (entries: GitOpsConfig | GitopsConfigEntry[]): GitOpsConfig => {
    if (isGitopsConfig(entries)) {
        return entries
    }

    if (!Array.isArray(entries) || entries.length === 0 || !isGitopsConfigEntry(entries[0])) {
        throw new Error('Provided value is not a GitopsConfigEntry array')
    }

    const result = entries
        .map(e => {
            const typeName = e.type === 'argocd' ? 'argocd-config' : 'payload'
            const layer = {}
            layer[typeName] = e

            const value = {}
            value[e.layer] = layer

            return value
        })
        .reduce((config: GitOpsConfig, value: any) => {
            return _.merge(config, value)
        }, {} as GitOpsConfig)

    return result as any
}

export async function parseGitFile<T>(gitUrl: string, filename: string, credentials: {username: string, password: string, caCert?: string | {cert: string, certFile: string}}, branch?: string): Promise<T> {

    const extension = filename.replace(/.*[.](.*)$/, '$1');

    const parser = parsers[extension];
    if (!parser) {
        throw new Error('Unknown extension for parsing: ' + extension);
    }

    try {
        const gitApi: GitApi = await apiFromUrl(gitUrl, credentials, branch);

        return parser(await gitApi.getFileContents({path: filename}));
    } catch (err) {
        console.log('Error getting file from git: ', {filename, gitUrl})
        throw err
    }
}


export const gitopsUtil = new GitopsUtil();
