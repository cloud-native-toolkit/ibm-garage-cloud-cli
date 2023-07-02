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

export enum MetadataErrorType {
    missing = 'missing'
}

export class MetadataMissing extends Error {
    readonly errorType: MetadataErrorType = MetadataErrorType.missing

    constructor() {
        super('Metadata not found in gitops repository!');
    }
}

export const isMetadataMissingError = (error: any): error is MetadataMissing => {
    return !!error && !!(error as MetadataMissing).errorType
}

export abstract class GitopsMetadataApi {
    abstract update(options: GitopsMetadataUpdateInput): Promise<GitopsMetadataUpdateResult>;
    abstract get(options: GitopsMetadataRetrieveInput): Promise<GitopsMetadataRetrieveResult>;
}
