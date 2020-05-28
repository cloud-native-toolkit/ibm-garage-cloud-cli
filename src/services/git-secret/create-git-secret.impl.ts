import {Inject} from 'typescript-ioc';
import {parse} from 'dot-properties';

import {CreateGitSecret, CreateGitSecretOptions, CreateGitSecretParams} from './create-git-secret.api';
import {GetGitParameters, GitParametersOptions, GitParams} from './git-parameters';
import {GitSecret, SECRET_NAME} from './git-secret';
import {KubeSecret} from '../../api/kubectl';
import {FsPromises} from '../../util/file-util';

const noopNotifyStatus = (s: string) => {
  return;
};

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
        return parse(data.toString());
      }
    } catch (err) {}

    return {};
  }
}
