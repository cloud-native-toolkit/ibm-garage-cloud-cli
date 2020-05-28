import {CreateWebhookOptions} from './create-webhook-options.model';
import {GitConfig} from '../git-secret';

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
