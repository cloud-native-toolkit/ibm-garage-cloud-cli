import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';

export abstract class GetGitParameters {
  abstract getGitParameters(options?: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;
  abstract getGitConfig(remote?: string, workingDir?: string): Promise<{ url: string; host: string; owner: string; repo: string }>;
}