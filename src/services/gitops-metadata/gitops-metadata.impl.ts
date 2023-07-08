import {GitApi, PullRequest} from "@cloudnativetoolkit/git-client";
import * as fs from "fs-extra";
import {pathExists} from "fs-extra";
import {join} from 'path';
import {SimpleGit} from "simple-git";
import {Container} from "typescript-ioc";
import * as YAML from 'js-yaml';

import {
    GitopsMetadataApi,
    GitopsMetadataRetrieveInput,
    GitopsMetadataRetrieveResult,
    GitopsMetadataUpdateInput,
    GitopsMetadataUpdateResult, Metadata, MetadataMissing
} from "./gitops-metadata.api";
import {ClusterSummaryApi, ClusterSummaryResult} from "../cluster-summary";
import {PackageManifestSummaryApi, PackageManifestSummaryResult} from "../package-manifest-summary";
import {BootstrapConfig, PayloadConfig} from "../../model";
import {gitopsUtil} from "../../util/gitops-util";
import {Logger} from "../../util/logger";

/*
'{packages: [.items[] | {"catalogSource": .status.catalogSource, "catalogSourceNamespace": .status.catalogSourceNamespace, "packageName": .status.packageName, "defaultChannel": .status.defaultChannel, "provider": .status.provider.name, "channels": [{"name": .status.channels[].name}] }] }'
 */

export class GitopsMetadataImpl implements GitopsMetadataApi {

    clusterService: ClusterSummaryApi
    packageService: PackageManifestSummaryApi
    logger: Logger

    userConfig = {
        email: 'cloudnativetoolkit@gmail.com',
        name: 'Cloud-Native Toolkit',
    };

    constructor() {
        this.clusterService = Container.get(ClusterSummaryApi)
        this.packageService = Container.get(PackageManifestSummaryApi)
        this.logger = Container.get(Logger)
    }

    async update(options: GitopsMetadataUpdateInput): Promise<GitopsMetadataUpdateResult> {

        const metadata: Metadata = await this.retrieveMetadataFromCluster(options)

        const layerConfig: BootstrapConfig = options.gitopsConfig.bootstrap

        const gitApi: GitApi = await gitopsUtil.loadGitApi(options, layerConfig["argocd-config"])

        const repoConfig = await this.commitConfig(gitApi, options, layerConfig["argocd-config"], metadata)

        if (options.autoMerge) {
            if (repoConfig.pullNumber) {
                await gitApi.updateAndMergePullRequest({
                    pullNumber: repoConfig.pullNumber,
                    method: 'squash',
                    rateLimit: options.rateLimit,
                    waitForBlocked: options.waitForBlocked
                })
            }
        }

        return {repoConfig};
    }

    async retrieveMetadataFromCluster(input: {gitopsNamespace?: string}): Promise<Metadata> {
        const clusterMetadata = await this.clusterService.summarizeCluster(input)
        const packageMetadata = await this.packageService.summarizePackageManifests()

        return Object.assign({}, clusterMetadata, packageMetadata);
    }

    async commitConfig(gitApi: GitApi, input: GitopsMetadataUpdateInput, config: PayloadConfig, metadata: Metadata): Promise<{path: string, url: string, branch: string, pullNumber?: number}>{

        const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').slice(0, 5);
        const repoDir = `${input.tmpDir}/.tmprepo-config-${suffix}`;

        // create repo dir
        await fs.mkdirp(repoDir);

        try {

            const git: SimpleGit = await gitApi.clone(repoDir, {baseDir: input.tmpDir, config: {'user.email': this.userConfig.email, 'user.name': this.userConfig.name}})

            const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
                if (inputBranch) {
                    return inputBranch;
                }

                return git.branch().then(result => result.current);
            }

            const currentBranch = await getCurrentBranch(input.branch)
            this.logger.debug(`Using ${currentBranch} as base branch`)
            const devBranch = `config-${suffix}`;

            this.logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`);
            await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

            const overlayPath = `${config.path}/cluster/${input.serverName}`;
            await fs.writeFile(`${repoDir}/${overlayPath}/metadata.yaml`, YAML.dump(metadata));

            const message = 'Add/update metadata config'

            const pushResult = await gitopsUtil.addCommitPushBranch(git, message, devBranch);

            if (!pushResult) {
                this.logger.log(`  No changes to config for ${config.repo} branch ${devBranch} in path ${overlayPath}`)
                return {
                    path: overlayPath,
                    url: `https://${config.repo}`,
                    branch: currentBranch
                }
            }

            this.logger.log(`  Configuration payload added to ${config.repo} branch ${devBranch} in path ${overlayPath}`)

            const pullRequest: PullRequest = await (gitApi
                .createPullRequest({
                    title: message,
                    sourceBranch: devBranch,
                    targetBranch: currentBranch,
                })
                .catch(err => {
                    console.log('Error creating pull request: ', err)
                    throw err
                }) as Promise<PullRequest>);

            const result = {
                path: overlayPath,
                url: `https://${config.repo}`,
                branch: currentBranch,
                pullNumber: pullRequest.pullNumber,
            };

            this.logger.debug('Config result', {result});

            return result;
        } catch (error) {
            this.logger.error('Error updating config metadata', {error});
            throw error;
        } finally {
            // clean up repo dir
            await fs.remove(repoDir);
        }
    }

    async get(options: GitopsMetadataRetrieveInput): Promise<GitopsMetadataRetrieveResult> {

        const layerConfig: BootstrapConfig = options.gitopsConfig.bootstrap || options.gitopsConfig.boostrap
        if (!layerConfig) {
            throw new Error('Unable to find bootstrap configuration')
        }
        const config: PayloadConfig = layerConfig["argocd-config"]

        const gitApi: GitApi = await gitopsUtil.loadGitApi(options, config)

        const metadata: Metadata = await this.retrieveMetadataFromGit(gitApi, options, config)

        return {metadata}
    }

    async retrieveMetadataFromGit(gitApi: GitApi, input: GitopsMetadataUpdateInput, config: PayloadConfig): Promise<Metadata>{

        const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').slice(0, 5);
        const repoDir = `${input.tmpDir}/.tmprepo-config-${suffix}`;

        // create repo dir
        await fs.mkdirp(repoDir);

        try {

            const git: SimpleGit = await gitApi.clone(repoDir, {baseDir: input.tmpDir, config: {'user.email': this.userConfig.email, 'user.name': this.userConfig.name}})

            const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
                if (inputBranch) {
                    return inputBranch;
                }

                return git.branch().then(result => result.current);
            }

            const currentBranch = await getCurrentBranch(input.branch)

            const overlayPath = join(config.path, 'cluster', input.serverName, 'metadata.yaml');
            const metadataPath = join(repoDir, overlayPath);

            if (!(await pathExists(metadataPath))) {
                throw new MetadataMissing(overlayPath)
            }

            const content = await fs.readFile(metadataPath);

            return YAML.load(content.toString()) as Metadata
        } catch (error) {
            this.logger.error('Error retrieving config metadata', {error});
            throw error;
        } finally {
            // clean up repo dir
            await fs.remove(repoDir);
        }
    }

}