import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';

export abstract class GetGitParameters {
  async abstract getGitParameters(options?: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;
  async abstract getGitConfig(remote?: string, workingDir?: string): Promise<{ url: string; host: string; org: string; repo: string }>;
}