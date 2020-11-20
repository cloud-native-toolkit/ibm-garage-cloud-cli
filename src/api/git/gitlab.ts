import {post, Response} from 'superagent';

import {CreateWebhook, GitApi, GitEvent, GitHeader, UnknownWebhookError, WebhookAlreadyExists} from './git.api';
import {GitBase} from './git.base';
import {TypedGitRepoConfig} from './git.model';
import {isResponseError} from '../../util/superagent-support';

interface GitlabHookData {
  id: string;
  url: string;
  push_events?: boolean;
  enable_ssl_verification?: boolean;
  token?: string;
}

interface GitlabParams {
  owner: string;
  repo: string;
  jenkinsUrl?: string;
  jenkinsUser?: string;
  jenkinsPassword?: string;
  jobName?: string;
  webhookUrl?: string;
}

enum GitlabHeader {
  event = 'X-GitLab-Event'
}

enum GitlabEvent {
  push = 'Push Hook'
}

export class Gitlab extends GitBase implements GitApi {
  constructor(config: TypedGitRepoConfig) {
    super(config);
  }

  getBaseUrl(): string {
    return `${this.config.protocol}://${this.config.host}/api/v4/projects/${this.config.owner}%2F${this.config.repo}`;
  }

  async createWebhook(options: CreateWebhook): Promise<string> {
    try {
      const response: Response = await post(this.getBaseUrl() + '/hooks')
        .set('Private-Token', this.config.password)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('application/json')
        .send(this.buildWebhookData(Object.assign({}, this.config, options)));

      return response.body.id;
    } catch (err) {
      if (isResponseError(err)) {
        if (err.response.text.match(/Hook already exists/)) {
          throw new WebhookAlreadyExists('Webhook already exists on repository', err);
        } else {
          throw new UnknownWebhookError('Unknown error creating webhook', err);
        }
      } else {
        throw new UnknownWebhookError(err.message, err);
      }
    }
  }

  buildWebhookData({owner, repo, jenkinsUrl = 'https://jenkins.local/', jenkinsUser, jenkinsPassword, jobName, webhookUrl}: GitlabParams): GitlabHookData {
    const urlParts = /(.*):\/\/(.*)\/*/.exec(jenkinsUrl);
    const protocol = urlParts[1];
    const host = urlParts[2];

    const credentials = (jenkinsUser && jenkinsPassword)
      ? `${jenkinsUser}:${jenkinsPassword}@`
      : '';

    const url = webhookUrl
      ? webhookUrl
      : `${protocol}://${credentials}${host}/project/${jobName}`;

    return {
      id: `${this.config.owner}%2F${this.config.repo}`,
      url,
      push_events: true,
      enable_ssl_verification: (protocol === 'https'),
    };
  }

  getRefPath(): string {
    return 'body.ref';
  }

  getRef(): string {
    return `refs/heads/${this.config.branch}`;
  }

  getRevisionPath(): string {
    return 'body.checkout_sha';
  }

  getRepositoryUrlPath(): string {
    return 'body.repository.git_http_url';
  }

  getRepositoryNamePath(): string {
    return 'body.project.path_with_namespace'
  }

  getHeader(headerId: GitHeader): string {
    return GitlabHeader[headerId];
  }

  getEventName(eventId: GitEvent): string {
    return GitlabEvent[eventId];
  }

}