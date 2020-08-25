import {Inject} from 'typescript-ioc';
import * as _ from 'lodash';

import {GitSecret, GitSecretParams, SECRET_NAME} from './git-secret.api';
import {GitParams} from './git-params.model';
import {ConfigMap, KubeConfigMap, KubeSecret, Secret} from '../../api/kubectl';

const noopNotifyStatus = (status: string) => {
  return;
};

export class GitSecretImpl implements GitSecret {
  @Inject
  readonly kubeSecret: KubeSecret;
  @Inject
  readonly kubeConfig: KubeConfigMap;

  async create({gitParams, namespaces = ['tools'], additionalParams = {}, replace = false, notifyStatus = noopNotifyStatus}: GitSecretParams): Promise<{secretName: string, configMapName: string}> {

    const namespaceValues = Array.isArray(namespaces) ? namespaces : [namespaces];
    const {secretName, configName} = this.buildGitNames(gitParams);

    const gitSecret = this.buildGitSecretBody(secretName, gitParams, additionalParams);

    const gitConfig = this.buildGitConfigBody(configName, gitParams);

    await Promise.all(namespaceValues.map(async (namespace) => {
      return Promise.all([
        this.createGitSecret(secretName, namespace, gitSecret, replace),
        this.createGitConfigMap(configName, namespace, gitConfig),
      ]);
    }));

    return {secretName, configMapName: configName};
  }

  async createGitSecret(secretName: string, namespace: string, gitSecret: Secret, replace: boolean): Promise<boolean | Secret> {
    if (!replace && await this.kubeSecret.exists(secretName, namespace)) {
      return true;
    } else {
      return this.kubeSecret.createOrUpdate(
        secretName,
        {body: gitSecret},
        namespace,
      );
    }
  }

  createGitConfigMap(configMapName: string, namespace: string, gitConfig: ConfigMap<any>): Promise<ConfigMap> {
    return this.kubeConfig.createOrUpdate(
      configMapName,
      {body: gitConfig},
      namespace);
  }

  private buildGitNames(gitParams: GitParams) {
    const secretName = SECRET_NAME;
    const configName = (gitParams.name).replace(/[.]/g, '-').toLowerCase();

    return {secretName, configName};
  }

  buildGitSecretBody(secretName: string, gitParams: GitParams, additionalParams: any = {}): Secret {
    const gitUrl = `https://${gitParams.host}`;

    return {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        labels: {
          'jenkins.io/credentials-type': 'usernamePassword',
          app: gitParams.repo,
          group: 'pipeline',
          type: 'git',
        },
        annotations: {
          description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
          'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
          'build.openshift.io/source-secret-match-uri-1': `${gitUrl}/*`,
          'tekton.dev/git-0': gitUrl
        },
      },
      type: 'kubernetes.io/basic-auth',
      stringData: Object.assign(
        {},
        additionalParams,
        _.pick(gitParams, ['username', 'password'])
      ),
    };
  }

  buildGitConfigBody(configName: string, gitParams: GitParams): ConfigMap {
    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: configName,
        labels: {
          app: gitParams.repo,
          group: 'pipeline',
          type: 'git',
        },
      },
      data:  _.pick(gitParams, ['url', 'host', 'org', 'repo', 'branch']),
    };
  }
}
