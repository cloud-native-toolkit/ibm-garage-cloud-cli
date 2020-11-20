import {Container} from 'typescript-ioc';
import * as _ from 'lodash';

import {SECRET_NAME} from './git-secret.api';
import {GitSecretImpl} from './git-secret.impl';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {factoryFromValue, setField} from '../../testHelper';
import {GitParams} from './git-params.model';
import Mock = jest.Mock;

describe('create-git-secret', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GitSecret', () => {
    let classUnderTest: GitSecretImpl;
    let mock_existsSecret: Mock;
    let mock_createOrUpdateSecret: Mock;
    let mock_createOrUpdateConfig: Mock;

    beforeEach(() => {
      mock_existsSecret = jest.fn();
      mock_createOrUpdateSecret = jest.fn();
      Container
        .bind(KubeSecret)
        .factory(factoryFromValue({
          exists: mock_existsSecret,
          createOrUpdate: mock_createOrUpdateSecret,
        }));

      mock_createOrUpdateConfig = jest.fn();
      Container
        .bind(KubeConfigMap)
        .factory(factoryFromValue({
          createOrUpdate: mock_createOrUpdateConfig,
        }));

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
        const name = 'expected name';
        const gitSecretBody = {secret: 'value'};
        const expectedResult = {metadata: {name}};

        mock_buildGitSecretBody.mockReturnValue(gitSecretBody);
        mock_createOrUpdateSecret.mockResolvedValue(expectedResult);

        const gitParams: any = {
          name: 'git name',
          host: 'github.com',
          org: 'org',
        };
        const namespace = 'namespace';
        const additionalParams = {};

        const actualResult = await classUnderTest.create({gitParams, namespaces: namespace, additionalParams});

        expect(actualResult).toEqual({configMapName: gitParams.name, secretName: SECRET_NAME});

        expect(mock_buildGitSecretBody).toHaveBeenCalledWith(SECRET_NAME, gitParams, additionalParams);
        expect(mock_createOrUpdateSecret).toHaveBeenCalledWith(SECRET_NAME, {body: gitSecretBody}, namespace);
      });
    });

    describe('buildGitSecretBody()', () => {
      const name = 'name';
      const org = 'org';
      const repo = 'repo';
      const host = 'host';
      const urlBase = `https://${host}/${org}`;
      const url = `${urlBase}/repo.git`;
      const username = 'username';
      const password = 'password';
      const branch = 'branch';

      const gitParams: GitParams = {
        name,
        url,
        username,
        password,
        branch,
        owner: org,
        repo,
        host,
      };
      const secretData = {
        url,
        username,
        password,
        branch,
        org,
        repo,
        host,
      };

      test('metadata.name=gitParams.name', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams.name, gitParams);

        expect(secret.metadata.name).toEqual(name);
      });

      test('should have source-secret-match-uri annotation', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams.name, gitParams);

        expect(secret.metadata.annotations['build.openshift.io/source-secret-match-uri-1'])
          .toEqual( `https://${host}/*`);
      });

      test('should have type=kubernetes.io/basic-auth', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams.name, gitParams);

        expect(secret.type).toEqual('kubernetes.io/basic-auth');
      });

      test('should have data from gitParams', () => {
        const secret = classUnderTest.buildGitSecretBody(gitParams.name, gitParams);

        expect(secret.stringData).toEqual(_.pick(secretData, ['username', 'password']));
      });
    });
  });
});
