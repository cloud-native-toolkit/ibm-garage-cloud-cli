import {CommandError, ErrorSeverity, ErrorType} from '../../util/errors';

export enum PipelineErrorType {
  JENKINS_MISSING = 'JENKINS_MISSING',
  NAMESPACE_MISSING = 'NAMESPACE_MISSING',
  NO_PIPELINE_NAMESPACE = 'NO_PIPELINE_NAMESPACE',
}

export interface PipelineError {
  readonly pipelineErrorType: PipelineErrorType;
  readonly clusterType: string;
}

export function isPipelineError(error: any): error is PipelineError {
  return (!!error) && !!(error.pipelineErrorType);
}

export class JenkinsMissingError extends Error implements PipelineError {
  constructor(message: string, private _clusterType: string) {
    super(message);
  }

  get clusterType(): string {
    return this._clusterType;
  }

  get pipelineErrorType(): PipelineErrorType {
    return PipelineErrorType.JENKINS_MISSING;
  }
}

export class NamespaceMissingError extends Error implements PipelineError {
  constructor(message: string, private _clusterType: string) {
    super(message);
  }

  get clusterType(): string {
    return this._clusterType;
  }

  get pipelineErrorType(): PipelineErrorType {
    return PipelineErrorType.NAMESPACE_MISSING;
  }
}

export class PipelineNamespaceNotProvided extends Error implements PipelineError {
  constructor(message: string, private _clusterType: string) {
    super(message);
  }

  get clusterType(): string {
    return this._clusterType;
  }

  get pipelineErrorType(): PipelineErrorType {
    return PipelineErrorType.NO_PIPELINE_NAMESPACE;
  }
}

export class RegisterPipelineOptions {
  templateNamespace: string;
  pipelineNamespace: string;
  skipWebhook?: boolean;
  workingDir?: string;
  gitUsername?: string;
  gitPat?: string;
  values?: string;
  generateCrumb?: boolean = false;
  serverUrl?: string;
  pipelineName?: string;
  replaceGitSecret?: boolean;
}

export const REGISTER_PIPELINE_ERROR_TYPES: {[key: string]: ErrorType} = {
  WEBHOOK: {name: 'WEBHOOK', severity: ErrorSeverity.WARNING}
}

export class WebhookError extends CommandError {
  constructor(message: string) {
    super(message, REGISTER_PIPELINE_ERROR_TYPES.WEBHOOK);
  }
}

export abstract class RegisterPipeline {
  async abstract registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus?: (status: string) => void);
}
