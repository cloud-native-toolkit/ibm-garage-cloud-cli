
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
}

export enum GitHeader {
  EVENT = 'event'
}

export enum GitEvent {
  PUSH = 'push'
}

export abstract class GitApi {
  async abstract createWebhook(request: CreateWebhook): Promise<string>;

  abstract buildWebhookParams(eventId: GitEvent): WebhookParams;
}


