import {post, Response} from 'superagent';
import {Provides} from 'typescript-ioc';

import {CreateWebhookOptions} from './create-webhook-options.model';

export enum GitEvents {
  push = 'push',
  pullRequest = 'pull_request'
}

type GitHookContentType = 'json' | 'form';

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
}

@Provides(CreateWebhook)
export class CreateWebhookImpl implements CreateWebhook {

  async createWebhook(options: CreateWebhookOptions): Promise<string> {

    const gitSlug = this.parseGitSlug(options.gitUrl);
    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    const response: Response = await post(this.buildGitUrl(options))
      .set(apiUrl.type === 'github'
        ? {'Authorization': `token ${options.gitToken}`}
        : {'Private-Token': options.gitToken})
      .set('User-Agent', `${options.gitUsername} via ibm-garage-cloud cli`)
      .accept(apiUrl.type === 'github' ? 'application/vnd.github.v3+json' : 'application/json')
      .send(apiUrl.type === 'gitlab'
        ? this.buildGitlabHookData(Object.assign({}, options, gitSlug))
        : this.buildGitWebhookData(options.jenkinsUrl));

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Error creating webhook: ' + response.status + ', ' + response.body);
    }

    return response.body.id;
  }

  buildGitUrl(options: CreateWebhookOptions) {
    const gitSlug = this.parseGitSlug(options.gitUrl);

    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    return `${apiUrl.url}/${apiUrl.type === 'gitlab' ? 'projects' : 'repos'}/${gitSlug.owner}${apiUrl.type === 'gitlab' ? '%2F' : '/'}${gitSlug.repo}/hooks`;
  }

  parseGitSlug(gitUrl: string): {protocol: string; host: string; owner: string; repo: string} {
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

  buildGitWebhookData(jenkinsUrl) {
    const pushGitHook: GitHookData = {
      name: 'web',
      events: [GitEvents.push],
      active: true,
      config: {
        url: `${jenkinsUrl}/github-webhook/`,
        content_type: 'json',
        insecure_ssl: GitHookUrlVerification.performed,
      }
    };
    return pushGitHook;
  }

  buildGitlabHookData({owner, repo, jenkinsUrl, jenkinsUser, jenkinsPassword, jobName}: GitlabParams): GitlabHookData {
    const urlParts = /(.*):\/\/(.*)\/*/.exec(jenkinsUrl);
    const protocol = urlParts[1];
    const host = urlParts[2];

    const credentials = (jenkinsUser && jenkinsPassword)
      ? `${jenkinsUser}:${jenkinsPassword}@`
      : '';

    return {
      id: `${owner}%2F${repo}`,
      url: `${protocol}://${credentials}${host}/project/${jobName}`,
      push_events: true,
      enable_ssl_verification: (protocol === 'https'),
    } as any;
  }
}
