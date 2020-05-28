import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';

export abstract class GetGitParameters {
  async abstract getGitParameters(options?: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;
}
