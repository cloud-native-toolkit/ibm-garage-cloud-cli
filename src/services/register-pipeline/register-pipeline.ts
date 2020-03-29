import {RegisterPipelineOptions} from './register-pipeline-options.model';

export enum PipelineErrorType {
  JENKINS_MISSING = 'JENKINS_MISSING',
  NAMESPACE_MISSING = 'NAMESPACE_MISSING',
}

export interface PipelineError {
  readonly pipelineErrorType: PipelineErrorType;
}

export function isPipelineError(error: any): error is PipelineError {
  return (!!error) && !!(error.pipelineErrorType);
}

export class JenkinsMissingError extends Error implements PipelineError {
  constructor(message: string) {
    super(message);
  }

  get pipelineErrorType(): PipelineErrorType {
    return PipelineErrorType.JENKINS_MISSING;
  }
}

export class NamespaceMissingError extends Error implements PipelineError {
  constructor(message: string) {
    super(message);
  }

  get pipelineErrorType(): PipelineErrorType {
    return PipelineErrorType.NAMESPACE_MISSING;
  }
}

export abstract class RegisterPipeline {
  async abstract registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus?: (status: string) => void);
}
