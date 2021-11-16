import {GitHost} from './git.model';

export class CreateWebhook {
  jenkinsUrl?: string;
  jenkinsUser?: string;
  jenkinsPassword?: string;
  jobName?: string;
  webhookUrl?: string;
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

export interface WebhookMatchers {
  gitrevision: string;
  gitrepositoryurl: string;
  headerEvent: string;
}

export interface WebhookParams {
  revisionPath: string;
  repositoryUrlPath: string;
  headerName: string;
  eventName: string;
  branchName: string;
  repositoryNamePath: string;
  repositoryName: string;
  refPath: string;
  ref: string;
}

export enum GitHeader {
  EVENT = 'event'
}

export enum GitEvent {
  PUSH = 'push'
}

export interface CreatePullRequestOptions {
  title: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
  issue?: number;
  maintainer_can_modify?: boolean;
}

export interface MergePullRequestOptions {
  pullNumber: number;
  method: 'merge' | 'squash' | 'rebase';
  title?: string;
  message?: string;
}

export interface PullRequest {
  pullNumber: number;
}

export abstract class LocalGitApi {
  abstract listFiles(): Promise<Array<{path: string, url?: string}>>;

  abstract getFileContents(fileDescriptor: {path: string, url?: string}): Promise<string | Buffer>;

  abstract getDefaultBranch(): Promise<string>;
}

export abstract class GitApi extends LocalGitApi {
  abstract getType(): GitHost;

  abstract createWebhook(request: CreateWebhook): Promise<string>;

  abstract buildWebhookParams(eventId: GitEvent): WebhookParams;

  abstract createPullRequest(options: CreatePullRequestOptions): Promise<PullRequest>;

  abstract mergePullRequest(options: MergePullRequestOptions): Promise<string>;

  abstract updatePullRequestBranch(pullNumber: number): Promise<string>;
}
