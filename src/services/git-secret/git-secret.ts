import {Inject, Provides} from 'typescript-ioc';
import * as _ from 'lodash';

import {GitParams} from './git-params.model';
import {KubeSecret, Secret} from '../../api/kubectl';
import {CreateGitSecretOptions} from './create-git-secret';

export abstract class GitSecret {
  async abstract create(gitParams: GitParams, namespaces: string | string[], additionalParams: any, notifyStatus?: (s: string) => void): Promise<string>;
}

const noopNotifyStatus = (status: string) => {
  return;
};

@Provides(GitSecret)
export class GitSecretImpl implements GitSecret {
  @Inject
  readonly kubeSecret: KubeSecret;

  async create(gitParams: GitParams, namespaces: string | string[] = ['tools'], additionalParams: any = {}, notifyStatus: (s: string) => void = noopNotifyStatus): Promise<string> {
    const gitSecret = this.buildGitSecretBody(gitParams, additionalParams);

    const namespaceValues = Array.isArray(namespaces) ? namespaces : [namespaces];

    notifyStatus('Creating secret: ' + gitParams.name);

    const gitName = gitParams.name.replace(/[.]/g, '-').toLowerCase();

    await Promise.all(namespaceValues.map(namespace => {
      const promise = this.kubeSecret.createOrUpdate(
        gitName,
        {body: gitSecret},
        namespace,
      );

      notifyStatus('  Secret created in \'' + namespace + '\' namespace');

      return promise;
    }));

    return gitName;
  }

  buildGitSecretBody(gitParams: GitParams, additionalParams: any = {}): Secret {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: gitParams.name.toLowerCase(),
        labels: {
          'jenkins.io/credentials-type': 'usernamePassword',
          app: gitParams.repo,
        },
        annotations: {
          description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
          'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
          'build.openshift.io/source-secret-match-uri-1': `${gitParams.url.replace(new RegExp('/[^/]*$'), '/*')}`,
          'tekton.dev/git-0': gitParams.url
        },
      },
      type: 'kubernetes.io/basic-auth',
      stringData: Object.assign(
        {},
        additionalParams,
        _.pick(gitParams, ['url', 'host', 'org', 'repo', 'username', 'password', 'branch'])
      ),
    };
  }
}
