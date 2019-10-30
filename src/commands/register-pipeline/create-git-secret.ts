import {KubeSecret, Secret} from '../../api/kubectl/secrets';
import * as secrets from '../../api/kubectl/secrets';
import {Container, Inject, Provides} from 'typescript-ioc';

export class GitParams {
  name: string;
  url: string;
  username: string;
  password: string;
  branch: string;
}

export abstract class GitSecret {
  async abstract create(gitParams: GitParams, namespace: string, additionalParams: any);
}

@Provides(GitSecret)
export class GitSecretImpl implements GitSecret {
  @Inject
  readonly kubeSecret: KubeSecret;

  async create(gitParams: GitParams, namespace: string = 'tools', additionalParams: any = {}) {
    const gitSecret = this.buildGitSecretBody(gitParams, additionalParams);

    return this.kubeSecret.createOrUpdate(
      gitParams.name,
      {body: gitSecret},
      namespace,
    );
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
//
// export async function createGitSecret(gitParams: GitParams, namespace: string = 'tools', additionalParams: any = {}) {
//   const gitSecret = buildGitSecretBody(gitParams, additionalParams);
//
//   const kubeSecret: KubeSecret = Container.get(KubeSecret);
//
//   return kubeSecret.create(gitParams.name,{body: gitSecret}, namespace);
// }
//
// export function buildGitSecretBody(gitParams: GitParams, additionalParams: any = {}): Secret {
//   return {
//     apiVersion: 'v1',
//     kind: 'Secret',
//     metadata: {
//       name: gitParams.name,
//       labels: {
//         'jenkins.io/credentials-type': 'usernamePassword'
//       },
//       annotations: {
//         description: `secret providing credentials for git repo ${gitParams.url} used by the Jenkins pipeline`,
//         'jenkins.io/credentials-description': `Git credentials for ${gitParams.url} stored in kubernetes secret`,
//         'build.openshift.io/source-secret-match-uri-1': `${gitParams.url.replace(new RegExp('/[^/]*$'), '/*')}`
//       },
//     },
//     type: 'kubernetes.io/basic-auth',
//     stringData: Object.assign({}, additionalParams, gitParams),
//   };
// }
