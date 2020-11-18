import {post, Response} from 'superagent';

import {CreateWebhook, GitApi, GitEvent, GitHeader, UnknownWebhookError, WebhookAlreadyExists} from './git.api';
import {GitBase} from './git.base';
import {TypedGitRepoConfig} from './git.model';
import {isResponseError} from '../../util/superagent-support';

enum GogsEvent {
  create = 'create',
  'delete' = 'delete',
  fork = 'fork',
  push = 'push',
  issues = 'issues',
  issue_comment = 'issue_comment',
  pull_request = 'pull_request',
  release = 'release',
}

interface GogsHookData {
  type: 'gogs' | 'slack';
  config: {
    url: string;
    content_type: 'json' | 'form';
    secret?: string;
  }
  events: GogsEvent[];
  active: boolean;
}

enum GogsHeader {
  event = 'X-Gogs-Event'
}

export class Gogs extends GitBase implements GitApi {
  constructor(config: TypedGitRepoConfig) {
    super(config);
  }

  getBaseUrl(): string {
    return `${this.config.protocol}://${this.config.host}/api/v1/repos/${this.config.owner}/${this.config.repo}`;
  }

  async createWebhook(options: CreateWebhook): Promise<string> {
    try {
      const response: Response = await post(this.getBaseUrl() + '/hooks')
        .auth(this.config.username, this.config.password)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('application/json')
        .send(this.buildWebhookData(options));

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

  buildWebhookData({webhookUrl}: {webhookUrl?: string}): GogsHookData {
    return {
      type: 'gogs',
      config: {
        url: webhookUrl,
        content_type: 'json'
      },
      events: [GogsEvent.push],
      active: true,
    };
  }

  getRevisionPath(): string {
    return 'body.after';
  }

  getRepositoryUrlPath(): string {
    return 'body.repository.clone_url';
  }

  getRepositoryNamePath(): string {
    return 'body.repository.full_name';
  }

  getHeader(headerId: GitHeader): string {
    return GogsHeader[headerId];
  }

  getEventName(eventId: GitEvent): string {
    return GogsEvent[eventId];
  }
}