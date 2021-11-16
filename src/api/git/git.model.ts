
export enum GitHost {
  github = 'Github',
  gitlab = 'Gitlab',
  ghe = 'GHE',
  gogs = 'Gogs',
  bitbucket = 'Bitbucket',
}

export interface GitRepoConfig {
  protocol: string;
  url: string;
  host: string;
  owner: string;
  repo: string;
  branch?: string;
  username?: string;
  password?: string;
}

export interface AuthGitRepoConfig extends GitRepoConfig {
  username: string;
  password: string;
}

export interface TypedGitRepoConfig extends AuthGitRepoConfig {
  type: GitHost;
}

export interface GitHookData {
  name: 'web';
  active: boolean;
  events: GitEvents[];
  config: GitHookConfig;
}

export interface GitHookConfig {
  url: string;
  content_type: GitHookContentType;
  secret?: string;
  insecure_ssl?: GitHookUrlVerification;
}

export enum GitHookContentType {
  json = 'json',
  form = 'form'
}

export enum GitHookUrlVerification {
  performed = '0',
  notPerformed = '1'
}

export enum GitEvents {
  push = 'push',
  pullRequest = 'pull_request'
}
