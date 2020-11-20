import {post, Response} from 'superagent';

import {CreateWebhook, GitApi, GitEvent, GitHeader, UnknownWebhookError, WebhookAlreadyExists} from './git.api';
import {TypedGitRepoConfig} from './git.model';
import {GitBase} from './git.base';
import {isResponseError} from '../../util/superagent-support';

enum BitbucketHeader {
  event = 'X-Event-Key'
}

enum BitbucketEvent {
  push = 'repo:push'
}

interface BitbucketHookData {
  description: string;
  url: string;
  active: boolean;
  events: BitbucketEvent[],
}

export class Bitbucket extends GitBase implements GitApi {
  constructor(config: TypedGitRepoConfig) {
    super(config);
  }

  getBaseUrl(): string {
    return `${this.config.protocol}://api.bitbucket.org/2.0/repositories/${this.config.owner}/${this.config.repo}`;
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

  buildWebhookData({webhookUrl}: {webhookUrl?: string}): BitbucketHookData {
    return {
      description: 'Webhook',
      url: webhookUrl,
      active: true,
      events: [BitbucketEvent.push],
    }
  }

  getRefPath(): string {
    return 'body.push.changes[0].new.name';
  }

  getRef(): string {
    return this.config.branch;
  }

  getRevisionPath(): string {
    return 'body.push.changes[0].new.target.hash';
  }

  getRepositoryUrlPath(): string {
    return 'body.repository.links.html.href';
  }

  getRepositoryNamePath(): string {
    return 'body.repository.full_name';
  }

  getHeader(headerId: GitHeader): string {
    return BitbucketHeader[headerId];
  }

  getEventName(eventId: GitEvent): string {
    return BitbucketEvent[eventId];
  }
}