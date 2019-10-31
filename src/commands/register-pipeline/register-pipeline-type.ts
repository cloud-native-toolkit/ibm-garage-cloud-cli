import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {GitParams} from './create-git-secret';

export abstract class RegisterPipelineType {
  abstract setupDefaultOptions(): Partial<RegisterPipelineOptions>;
  async abstract registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string }>;
}
