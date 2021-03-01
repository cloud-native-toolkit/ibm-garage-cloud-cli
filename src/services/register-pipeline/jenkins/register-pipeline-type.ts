import {RegisterPipelineOptions} from '../register-pipeline.api';
import {GitParams} from '../../git-secret';

export abstract class RegisterPipelineType {
  abstract setupDefaultOptions(): Promise<Partial<RegisterPipelineOptions>>;
  abstract registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams, pipelineName: string, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string; webhookUrl?: string }>;
}
