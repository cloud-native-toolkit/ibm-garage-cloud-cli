import rewire = require('rewire');
import {GitParams} from './create-git-secret';

const module = rewire('./create-git-secret');

const createGitSecret = module.__get__('createGitSecret');
const buildGitSecretBody = module.__get__('buildGitSecretBody');

describe('create-git-secret', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('createGitSecret()', () => {

    let mock_createSecret;
    let unset_createSecret;

    let mock_buildGitSecretBody;
    let unset_buildGitSecretBody;

    beforeEach(() => {
      mock_createSecret = jest.fn();
      unset_createSecret = module.__set__('createSecret', mock_createSecret) as () => void;

      mock_buildGitSecretBody = jest.fn();
      unset_buildGitSecretBody = module.__set__('buildGitSecretBody', mock_buildGitSecretBody) as () => void;
    });

    afterEach(() => {
      unset_createSecret();
      unset_buildGitSecretBody();
    });

    test('should call createSecret() with result from buildGitSecretBody()', async () => {
      const gitSecretBody = {secret: 'value'};
      const expectedResult = {};

      mock_buildGitSecretBody.mockReturnValue(gitSecretBody);
      mock_createSecret.mockResolvedValue(expectedResult);

      const gitParams = {
        name: 'git name'
      };
      const namespace = 'namespace';
      const additionalParams = {};

      const actualResult = await createGitSecret(gitParams, namespace, additionalParams);

      expect(actualResult).toEqual(expectedResult);

      expect(mock_createSecret).toHaveBeenCalledWith(namespace, gitParams.name, {body: gitSecretBody});
    });
  });

  describe('buildGitSecretBody()', () => {
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

    test('metadata.name=gitParams.name', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.metadata.name).toEqual(name);
    });

    test('should have source-secret-match-uri annotation', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.metadata.annotations['build.openshift.io/source-secret-match-uri-1'])
        .toEqual(urlBase + '/*');
    });

    test('should have type=kubernetes.io/basic-auth', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.type).toEqual('kubernetes.io/basic-auth');
    });

    test('should have type=kubernetes.io/basic-auth', () => {
      const secret = buildGitSecretBody(gitParams);

      expect(secret.stringData).toEqual(gitParams);
    });
  });
});
