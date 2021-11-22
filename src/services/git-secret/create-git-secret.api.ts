import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './index';

export class GitSlug {
  protocol: string;
  host: string;
  owner: string;
  repo: string;
}

export class GitConfig extends GitSlug {
  url: string;
  type: string;
}

export interface GitlabHookData {
  id: string;
  url: string;
  push_events?: boolean;
  enable_ssl_verification?: boolean;
  token?: string;
}

export interface GitlabParams {
  owner: string;
  repo: string;
  jenkinsUrl?: string;
  jenkinsUser?: string;
  jenkinsPassword?: string;
  jobName?: string;
  webhookUrl?: string;
}

export interface GitAuthResponse {
  "id": number;
  "url": string;
  "scopes": string[];
  "token": string;
  "token_last_eight": string;
  "hashed_token": string;
  "app": {
    "url": string;
    "name": string;
    "client_id": string;
  },
  "note": string;
  "note_url": string;
  "updated_at": string;
  "created_at": string;
  "fingerprint": string;
}

export class CreateGitSecretOptions extends GitParametersOptions {
  gitUrl?: string;
  namespaces: string[] | string;
  values?: string;
  replace?: boolean;
}

export abstract class CreateGitSecret {
  abstract getParametersAndCreateSecret(options: CreateGitSecretOptions, notifyStatus?: (s: string) => void): Promise<{gitParams: GitParams, secretName: string, configMapName: string}>;

  abstract getGitParameters(options: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;

  abstract createGitSecret(params: CreateGitSecretParams): Promise<{secretName: string, configMapName: string}>;
}

export interface CreateGitSecretParams {
  gitParams: GitParams;
  namespaces: string | string[];
  valuesFile: string;
  replace?: boolean;
  name?: string;
  notifyStatus?: (s: string) => void;
}
