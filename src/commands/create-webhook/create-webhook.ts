import * as superagent from 'superagent';
import {Provides} from 'typescript-ioc';

import {CreateWebhookOptions} from './create-webhook-options.model';

enum GitEvents {
  push = 'push',
  pullRequest = 'pull_request'
}

type GitHookContentType = 'json' | 'form';

enum GitHookUrlVerification {
  performed = '0',
  notPerformed = '1'
}

interface GitHookData {
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

    const response: superagent.Response = await superagent
      .post(this.buildGitUrl(options))
      .set('Authorization', `token ${options.gitToken}`)
      .set('User-Agent', `${options.gitUsername} via ibm-garage-cloud cli`)
      .accept('application/vnd.github.v3+json')
      .send(this.buildWebhookData(options.jenkinsUrl));

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Error creating webhook: ' + response.status + ', ' + response.body);
    }

    return response.body.id;
  }

  buildGitUrl(options: CreateWebhookOptions) {
    const apiUrl = this.gitApiUrl(options.gitUrl);

    const gitSlug = this.parseGitSlug(options.gitUrl);

    return `${apiUrl}/repos/${gitSlug.owner}/${gitSlug.repo}/hooks`;
  }

  parseGitSlug(gitUrl: string): {owner: string; repo: string;} {
    const results: string[] = new RegExp('https{0,1}:\/\/[^\/]+\/([^\/]+)\/([^\/]+)').exec(gitUrl);

    if (!results || results.length < 3) {
      throw new Error(`Invalid url: ${gitUrl}`);
    }

    return {owner: results[1], repo: results[2].replace('.git', '')};
  }

  gitApiUrl(gitUrl: string) {
    const apiUrl = (/https:\/\/github.com/.test(gitUrl))
      ? 'https://api.github.com'
      : `${gitUrl}/api/v3`;
    return apiUrl;
  }

  buildWebhookData(jenkinsUrl) {
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
}
