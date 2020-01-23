import {RegisterPipelineOptions} from './register-pipeline-options.model';

export abstract class RegisterPipeline {
  async abstract registerPipeline(cliOptions: RegisterPipelineOptions, notifyStatus?: (status: string) => void);
}
