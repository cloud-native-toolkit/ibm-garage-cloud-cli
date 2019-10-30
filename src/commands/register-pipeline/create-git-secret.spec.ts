import {GitParams, GitSecret, GitSecretImpl} from './create-git-secret';
import {Container} from 'typescript-ioc';
import {KubeSecret} from '../../api/kubectl';
import {setField, providerFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('create-git-secret', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GitSecret', () => {
    let classUnderTest: GitSecretImpl;
    let mock_createOrUpdateSecret: Mock;

    beforeEach(() => {
      mock_createOrUpdateSecret = jest.fn();
      Container
        .bind(KubeSecret)
        .provider(providerFromValue({createOrUpdate: mock_createOrUpdateSecret}));

      classUnderTest = Container.get(GitSecretImpl);
    });

    describe('create()', () => {

      let mock_buildGitSecretBody;
      let unset_buildGitSecretBody;

      beforeEach(() => {
        mock_buildGitSecretBody = jest.fn();
        unset_buildGitSecretBody = setField(classUnderTest, 'buildGitSecretBody', mock_buildGitSecretBody);
      });

      afterEach(() => {
        unset_buildGitSecretBody();
      });

      test('should call secret.create() with result from buildGitSecretBody()', async () => {
        const gitSecretBody = {secret: 'value'};
        const expectedResult = {};

        mock_buildGitSecretBody.mockReturnValue(gitSecretBody);
        mock_createOrUpdateSecret.mockResolvedValue(expectedResult);

        const gitParams: any = {
          name: 'git name'
        };
        const namespace = 'namespace';
        const additionalParams = {};

        const actualResult = await classUnderTest.create(gitParams, namespace, additionalParams);

        expect(actualResult).toEqual(expectedResult);

        expect(mock_buildGitSecretBody).toHaveBeenCalledWith(gitParams, additionalParams);
        expect(mock_createOrUpdateSecret).toHaveBeenCalledWith(gitParams.name, {body: gitSecretBody}, namespace);
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
        const secret = classUnderTest.buildGitSecretBody(gitParams);

        expect(secret.metadata.name).toEqual(name);
      });

      test('should have source-secret-match-uri annotation', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams);

        expect(secret.metadata.annotations['build.openshift.io/source-secret-match-uri-1'])
          .toEqual(urlBase + '/*');
      });

      test('should have type=kubernetes.io/basic-auth', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams);

        expect(secret.type).toEqual('kubernetes.io/basic-auth');
      });

      test('should have type=kubernetes.io/basic-auth', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams);

        expect(secret.stringData).toEqual(gitParams);
      });
    });
  });
});
