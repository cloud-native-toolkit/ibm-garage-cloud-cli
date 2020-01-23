import {post, Response} from 'superagent';
import {Provides} from 'typescript-ioc';

import {CreateWebhookOptions} from './create-webhook-options.model';

export enum GitEvents {
  push = 'push',
  pullRequest = 'pull_request'
}

type GitHookContentType = 'json' | 'form';

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

export enum GitHookUrlVerification {
  performed = '0',
  notPerformed = '1'
}

export interface GitHookData {
  name: 'web';
  active: boolean;
  events: GitEvents[];
  config: GitHookConfig;
}

interface GitHookConfig {
  url: string;
  content_type: GitHookContentType;
  secret?: string;
  insecure_ssl?: GitHookUrlVerification;
}

export interface GitlabHookData {
  id: string;
  url: string;
  push_events?: boolean;
  enable_ssl_verification?: boolean;
  token?: string;
}

interface GitlabParams {
  owner: string;
  repo: string;
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsPassword: string;
  jobName: string;
  webhookUrl?: string;
}

interface GitAuthResponse {
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

export abstract class CreateWebhook {
  async abstract createWebhook(options: CreateWebhookOptions): Promise<string>;
  abstract extractGitConfig(gitUrl: string): GitConfig;
}


export enum CreateWebhookErrorTypes {
  alreadyExists = 'alreadyExists',
  unknown = 'unknown'
}

export class CreateWebhookError extends Error {
  constructor(public readonly errorType: CreateWebhookErrorTypes, message: string, public readonly causedBy?: Error) {
    super(message);
  }
}

export class WebhookAlreadyExists extends CreateWebhookError {
  constructor(message: string, causedBy?: Error) {
    super(CreateWebhookErrorTypes.alreadyExists, message, causedBy);
  }
}

export class UnknownWebhookError extends CreateWebhookError {
  constructor(message: string, causedBy?: Error) {
    super(CreateWebhookErrorTypes.unknown, message, causedBy);
  }
}

export function isCreateWebhookError(error: Error): error is CreateWebhookError {
  return error && !!(error as CreateWebhookError).errorType;
}

interface ResponseError extends Error {
  status: number;
  response: {
    req: object;
    header: object;
    status: number;
    text: string;
  }
}

export function isResponseError(error: Error): error is ResponseError {
  return error && !!((error as ResponseError).status);
}

@Provides(CreateWebhook)
export class CreateWebhookImpl implements CreateWebhook {

  async createWebhook(options: CreateWebhookOptions): Promise<string> {

    const gitConfig: GitConfig = this.extractGitConfig(options.gitUrl);

    try {
      const response: Response = await post(this.buildGitUrl(options))
        .set(gitConfig.type === 'github'
          ? {'Authorization': `token ${options.gitToken}`}
          : {'Private-Token': options.gitToken})
        .set('User-Agent', `${options.gitUsername} via ibm-garage-cloud cli`)
        .accept(gitConfig.type === 'github' ? 'application/vnd.github.v3+json' : 'application/json')
        .send(gitConfig.type === 'gitlab'
          ? this.buildGitlabHookData(Object.assign({}, options, gitConfig))
          : this.buildGitWebhookData(options.jenkinsUrl, options.webhookUrl));

      return response.body.id;
    } catch (err) {
      if (isResponseError(err)) {
        if (err.response.text.match(/Hook already exists/)) {
          throw new WebhookAlreadyExists('Webhook already exists on repository', err);
        } else {
          throw new UnknownWebhookError('Unknown error creating webhook', err);
        }
      } else {
        console.log('Error is not a response error', err);
        throw new UnknownWebhookError(err.message, err);
      }
    }
  }

  buildGitUrl(options: CreateWebhookOptions) {
    const gitSlug = this.parseGitSlug(options.gitUrl);

    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    return `${apiUrl.url}/${apiUrl.type === 'gitlab' ? 'projects' : 'repos'}/${gitSlug.owner}${apiUrl.type === 'gitlab' ? '%2F' : '/'}${gitSlug.repo}/hooks`;
  }

  extractGitConfig(gitUrl: string): GitConfig {
    const gitSlug: GitSlug = this.parseGitSlug(gitUrl);
    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    return Object.assign(
      {},
      gitSlug,
      apiUrl,
    );
  }

  parseGitSlug(gitUrl: string): GitSlug {
    const results: string[] = new RegExp('(https{0,1}):\/\/([^\/]+)\/([^\/]+)\/([^\/]+)').exec(gitUrl);

    if (!results || results.length < 5) {
      throw new Error(`Invalid url: ${gitUrl}`);
    }

    return {protocol: results[1], host: results[2], owner: results[3], repo: results[4].replace('.git', '')};
  }

  gitApiUrl({protocol, host}: {protocol: string, host: string}): {url: string, type: string} {
    return (host === 'github.com')
      ? {url: 'https://api.github.com', type: 'github'}
      : (/.*git.cloud.ibm.com/.test(host)
        ? {url: `${protocol}://${host}/api/v4`, type: 'gitlab'}
        : {url: `${protocol}://${host}/api/v3`, type: 'ghe'});
  }

  buildGitWebhookData(jenkinsUrl: string, webhookUrl?: string) {
    const url = webhookUrl ? webhookUrl : `${jenkinsUrl}/github-webhook/`;

    console.log('Creating webhook to url: ', url);

    const pushGitHook: GitHookData = {
      name: 'web',
      events: [GitEvents.push],
      active: true,
      config: {
        url,
        content_type: 'json',
        insecure_ssl: GitHookUrlVerification.performed,
      }
    };
    return pushGitHook;
  }

  buildGitlabHookData({owner, repo, jenkinsUrl, jenkinsUser, jenkinsPassword, jobName, webhookUrl}: GitlabParams): GitlabHookData {
    const urlParts = /(.*):\/\/(.*)\/*/.exec(jenkinsUrl);
    const protocol = urlParts[1];
    const host = urlParts[2];

    const credentials = (jenkinsUser && jenkinsPassword)
      ? `${jenkinsUser}:${jenkinsPassword}@`
      : '';

    const url = webhookUrl
      ? webhookUrl
      : `${protocol}://${credentials}${host}/project/${jobName}`;

    console.log('Creating webhook to url: ', url);

    return {
      id: `${owner}%2F${repo}`,
      url,
      push_events: true,
      enable_ssl_verification: (protocol === 'https'),
    } as any;
  }
}
