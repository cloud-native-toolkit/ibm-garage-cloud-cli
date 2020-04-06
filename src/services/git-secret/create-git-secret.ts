import {Inject, Provides} from 'typescript-ioc';
import {parse} from 'dot-properties';

import {GitParams} from './git-params.model';
import {GetGitParameters} from './git-parameters';
import {GitParametersOptions} from './git-parameters-options.model';
import {GitSecret, SECRET_NAME} from './git-secret';
import {FsPromises} from '../../util/file-util';
import {KubeSecret} from '../../api/kubectl';

export class CreateGitSecretOptions extends GitParametersOptions {
  namespaces: string[] | string;
  values?: string;
  replace?: boolean;
}

export abstract class CreateGitSecret {
  abstract async getParametersAndCreateSecret(options: CreateGitSecretOptions, notifyStatus?: (s: string) => void): Promise<{gitParams: GitParams, secretName: string, configMapName: string}>;

  abstract async getGitParameters(options: GitParametersOptions, notifyStatus?: (s: string) => void): Promise<GitParams>;

  abstract async createGitSecret(params: CreateGitSecretParams): Promise<{secretName: string, configMapName: string}>;
}

export interface CreateGitSecretParams {
  gitParams: GitParams;
  namespaces: string | string[];
  valuesFile: string;
  replace?: boolean;
  name?: string;
  notifyStatus?: (s: string) => void;
}


const noopNotifyStatus = (s: string) => {
  return;
};

@Provides(CreateGitSecret)
export class CreateGitSecretImpl implements CreateGitSecret {
  @Inject
  private kubeSecret: KubeSecret;
  @Inject
  private gitParameters: GetGitParameters;
  @Inject
  private gitSecret: GitSecret;
  @Inject
  private fs: FsPromises;

  async getParametersAndCreateSecret(options: CreateGitSecretOptions, notifyStatus: (s: string) => void = (s: string) => {return;}): Promise<{gitParams: GitParams, secretName: string, configMapName: string}> {

    const updatedOptions: CreateGitSecretOptions = await this.updateOptionsFromCurrentSecret(options, notifyStatus);

    const gitParams: GitParams = await this.getGitParameters(updatedOptions, notifyStatus);

    const {secretName, configMapName} = await this.createGitSecret({
      gitParams,
      namespaces: updatedOptions.namespaces,
      valuesFile: updatedOptions.values,
      replace: updatedOptions.replace,
      notifyStatus,
    });

    return {gitParams, secretName, configMapName};
  }

  async updateOptionsFromCurrentSecret(options: CreateGitSecretOptions, notifyStatus: (s: string) => void): Promise<CreateGitSecretOptions> {
    if (!options.replace && await this.kubeSecret.exists(SECRET_NAME, options.namespaces[0])) {
      const {username, password} = await this.kubeSecret.getData(SECRET_NAME, options.namespaces[0]);

      notifyStatus(`Git credentials have already been stored for user: ${username}`);

      return Object.assign(
        {},
        options,
        {
          gitUsername: username,
          gitPat: password,
        })
    } else {
      return options;
    }
  }

  async getGitParameters(options: GitParametersOptions, notifyStatus: (s: string) => void = (s: string) => {return;}): Promise<GitParams> {
    return this.gitParameters.getGitParameters(options, notifyStatus);
  }

  async createGitSecret({gitParams, namespaces, valuesFile, name, replace, notifyStatus = (s: string) => {return;}}: CreateGitSecretParams): Promise<{secretName: string, configMapName: string}> {
    return this.gitSecret.create({
      gitParams,
      namespaces,
      additionalParams: await this.readValuesFile(valuesFile),
      replace,
      notifyStatus,
    });
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
