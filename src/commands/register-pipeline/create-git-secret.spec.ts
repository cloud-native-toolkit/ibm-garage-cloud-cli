import rewire = require('rewire');
import {GitParams} from './create-git-secret';

const module = rewire('./create-git-secret');

const buildGitSecretBody = module.__get__('buildGitSecretBody');

describe('create-git-secret', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('buildGitSecretBody', () => {
    const name = 'name';
    const urlBase = 'https://github.com/org';
    const url = `${urlBase}/repo.git`;
    const username = 'username';
    const password = 'password';
    const branch = 'branch';

    const gitParams: GitParams = {
      name,
      url,
      username,
      password,
      branch
    };

    test('body.metadata.name=gitParams.name', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.body.metadata.name).toEqual(name);
    });

    test('should have source-secret-match-uri annotation', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.body.metadata.annotations['build.openshift.io/source-secret-match-uri-1'])
        .toEqual(urlBase + '/*');
    });

    test('should have type=kubernetes.io/basic-auth', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.body.type).toEqual('kubernetes.io/basic-auth');
    });

    test('should have type=kubernetes.io/basic-auth', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.body.stringData).toEqual(gitParams);
    });
  });
});
