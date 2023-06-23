import {GitOpsConfig, GitOpsCredentials, GitOpsLayer} from "../../model";

export type GitOpsModuleOptions = GitOpsModuleInputBase & Partial<GitOpsModuleInputDefaults> & {
  bootstrapRepoUrl?: string;
  gitopsConfigFile?: string;
  gitopsCredentialsFile?: string;
  autoMerge?: boolean;
  rateLimit?: boolean;
  username?: string;
  token?: string;
  valueFiles?: string;
  delete?: boolean;
  waitForBlocked?: string;
  branch?: string;
};

export type GitOpsModuleInput = GitOpsModuleInputBase & GitOpsModuleInputDefaults & {
  valueFiles: string[];
  gitopsCredentials: GitOpsCredentials;
  gitopsConfig: GitOpsConfig;
  cascadingDelete?: boolean;
};

export interface GitOpsModuleInputBase {
  name: string;
  namespace: string;
  gitopsConfig: GitOpsConfig;
  ignoreDiff?: string;
  caCert?: string;
  helmRepoUrl?: string;
  helmChart?: string;
  helmChartVersion?: string;
}
export interface GitOpsModuleInputDefaults {
  isNamespace: boolean;
  applicationPath: string;
  branch: string;
  layer: GitOpsLayer;
  serverName: string;
  tmpDir: string;
  contentDir: string;
  type: string;
}

export interface GitOpsModuleResult {}

export abstract class GitOpsModuleApi {
  abstract delete(options: GitOpsModuleOptions): Promise<GitOpsModuleResult>;
  abstract populate(options: GitOpsModuleOptions): Promise<GitOpsModuleResult>;
}
