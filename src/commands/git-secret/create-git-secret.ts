import {Inject, Provides} from 'typescript-ioc';
import {parse} from 'dot-properties';

import {GitParams} from './git-params.model';
import {GetGitParameters} from './git-parameters';
import {GitParametersOptions} from './git-parameters-options.model';
import {GitSecret} from './git-secret';
import {FsPromises} from '../../util/file-util';

export class CreateGitSecretOptions extends GitParametersOptions {
  namespaces: string[] | string;
  values?: string;
}

export abstract class CreateGitSecret {
  abstract async getParametersAndCreateSecret(options: CreateGitSecretOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;

  abstract async getGitParameters(options: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;

  abstract async createGitSecret(gitParams: GitParams, namespaces: string | string[], valuesFile: string, notifyStatus?: (s: string) => void): Promise<string>;
}


const noopNotifyStatus = (s: string) => {
  return;
};

@Provides(CreateGitSecret)
export class CreateGitSecretImpl implements CreateGitSecret {
  @Inject
  private gitParameters: GetGitParameters;
  @Inject
  private gitSecret: GitSecret;
  @Inject
  private fs: FsPromises;

  async getParametersAndCreateSecret(options: CreateGitSecretOptions, notifyStatus: (s: string) => void = (s: string) => {return;}): Promise<GitParams> {

    const gitParams: GitParams = await this.getGitParameters(options, notifyStatus);

    await this.createGitSecret(
      gitParams,
      options.namespaces,
      options.values,
      notifyStatus
    );

    return gitParams;
  }

  async getGitParameters(options: GitParametersOptions, notifyStatus: (s: string) => void = (s: string) => {return;}): Promise<GitParams> {
    return this.gitParameters.getGitParameters(options, notifyStatus);
  }

  async createGitSecret(gitParams: GitParams, namespaces: string | string[], valuesFile: string, notifyStatus: (s: string) => void = (s: string) => {return;}): Promise<string> {
    return this.gitSecret.create(
      gitParams,
      namespaces,
      await this.readValuesFile(valuesFile),
      notifyStatus
    );
  }

  async readValuesFile(valuesFileName?: string): Promise<any> {
    if (!valuesFileName) {
      return {}
    }

    try {
      const data: Buffer = await this.fs.readFile(valuesFileName);

      try {
        return JSON.parse(data.toString());
      } catch (err) {
        return parse(data);
      }
    } catch (err) {}

    return {};
  }
}
