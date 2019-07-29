import {Secret} from '../../api/kubectl/secrets';
import * as secrets from '../../api/kubectl/secrets';

// Get values this way to allow rewire
let createSecret = secrets.createSecret;

export class GitParams {
  name: string;
  url: string;
  username: string;
  password: string;
  branch: string;
}

export async function createGitSecret(gitParams: GitParams, namespace: string = 'tools', additionalParams: any = {}) {
  console.log('creating git secret', namespace, gitParams.name, gitParams, additionalParams);

  return createSecret(namespace, gitParams.name, buildGitSecretBody(gitParams, additionalParams));
}

function buildGitSecretBody(gitParams: GitParams, additionalParams: any = {}): {body: Secret} {
  return {
    body: {
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
    }
  };
}
