import {KubeSecret, Secret} from '../../api/kubectl/secrets';
import * as secrets from '../../api/kubectl/secrets';
import {Container, Inject, Provides} from 'typescript-ioc';

export class GitParams {
  name: string;
  url: string;
  username: string;
  password: string;
  branch: string;
  type?: string;
}

export abstract class GitSecret {
  async abstract create(gitParams: GitParams, namespaces: string | string[], additionalParams: any): Promise<string>;
}

@Provides(GitSecret)
export class GitSecretImpl implements GitSecret {
  @Inject
  readonly kubeSecret: KubeSecret;

  async create(gitParams: GitParams, namespaces: string | string[] = ['tools'], additionalParams: any = {}): Promise<string> {
    const gitSecret = this.buildGitSecretBody(gitParams, additionalParams);

    const namespaceValues = Array.isArray(namespaces) ? namespaces : [namespaces];

    await Promise.all(namespaceValues.map(namespace => this.kubeSecret.createOrUpdate(
      gitParams.name,
      {body: gitSecret},
      namespace,
    )));

    return gitParams.name;
  }

  buildGitSecretBody(gitParams: GitParams, additionalParams: any = {}): Secret {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: gitParams.name,
        labels: {
          'jenkins.io/credentials-type': 'usernamePassword'
        },
        annotations: {
          description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
          'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
          'build.openshift.io/source-secret-match-uri-1': `${gitParams.url.replace(new RegExp('/[^/]*$'), '/*')}`
        },
      },
      type: 'kubernetes.io/basic-auth',
      stringData: Object.assign({}, additionalParams, gitParams),
    };
  }
}
