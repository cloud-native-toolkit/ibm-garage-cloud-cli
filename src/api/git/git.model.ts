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
}

export interface AuthGitRepoConfig extends GitRepoConfig {
  username: string;
  password: string;
}

export interface TypedGitRepoConfig extends AuthGitRepoConfig {
  type: GitHost;
}
