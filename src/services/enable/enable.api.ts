import {EnablePipelineModel} from './enable.model';

export interface PipelineIndex {
  name?: string;
  url?: string;
  version?: string;
}

export interface PipelineIndicies {
  version?: string;
  pipelines?: {
    [pipeline: string]: PipelineIndex;
  };
  branches?: {
    [branch: string]: {
      [pipeline: string]: PipelineIndex[];
    }
  }
}

export interface EnablePipelineResult {
  repository: string;
  pipeline: PipelineIndex;
  branch: string;
  filesChanged: string[];
}

export class PipelineVersionNotFound extends Error {
  constructor(message, public readonly branch: string, public readonly pipeline, public readonly versions: string[]) {
    super(message);
  }
}

export abstract class EnablePipeline {
  abstract enable(options: EnablePipelineModel): Promise<EnablePipelineResult>;
}
