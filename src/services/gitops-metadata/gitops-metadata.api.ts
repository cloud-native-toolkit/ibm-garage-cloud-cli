import {GitOpsConfig, GitOpsCredentials} from "../../model";
import {ClusterSummaryResult} from "../cluster-summary";
import {PackageManifestSummaryResult} from "../package-manifest-summary";

export interface GitopsMetadataInput {
    bootstrapRepoUrl?: string
    gitopsConfig: GitOpsConfig
    gitopsCredentials: GitOpsCredentials
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
}

export interface GitopsMetadataUpdateInput extends GitopsMetadataInput {
}

export interface GitopsMetadataUpdateResult {
    repoConfig: {
        path: string
        url: string
        branch: string
        pullNumber?: number
    }
}

export interface GitopsMetadataRetrieveInput extends GitopsMetadataInput {
}

export type Metadata = ClusterSummaryResult & PackageManifestSummaryResult

export interface GitopsMetadataRetrieveResult {
    metadata: Metadata
}

export abstract class GitopsMetadataApi {
    abstract update(options: GitopsMetadataUpdateInput): Promise<GitopsMetadataUpdateResult>;
    abstract get(options: GitopsMetadataRetrieveInput): Promise<GitopsMetadataRetrieveResult>;
}
