import {GitApi, GitEvent, GitHeader, WebhookParams} from './git.api';
import {TypedGitRepoConfig} from './git.model';
import {Inject} from 'typescript-ioc';
import {Logger} from '../../util/logger';

export abstract class GitBase extends GitApi {
  @Inject
  logger: Logger;

  constructor(public config: TypedGitRepoConfig) {
    super();
  }

  buildWebhookParams(eventId: GitEvent): WebhookParams {
    return {
      revisionPath: this.getRevisionPath(),
      repositoryUrlPath: this.getRepositoryUrlPath(),
      headerName: this.getHeader(GitHeader.EVENT),
      eventName: this.getEventName(eventId),
      branchName: this.config.branch,
      repositoryNamePath: 'body.repository.full_name',
      repositoryName: `${this.config.owner}/${this.config.repo}`
    }
  }

  abstract getRevisionPath(): string;

  abstract getRepositoryUrlPath(): string;

  abstract getRepositoryNamePath(): string;

  abstract getHeader(headerId: GitHeader): string;

  abstract getEventName(eventId: GitEvent): string;
}

