export enum GitHost {
  github = 'github',
  gitlab = 'gitlab',
  ghe = 'ghe',
  gogs = 'gogs'
}

export interface GitRepoConfig {
  protocol: string;
  url: string;
  host: string;
  owner: string;
  repo: string;
  branch?: string;
}

export interface AuthGitRepoConfig extends GitRepoConfig {
  username: string;
  password: string;
}

export interface TypedGitRepoConfig extends AuthGitRepoConfig {
  type: GitHost;
}
