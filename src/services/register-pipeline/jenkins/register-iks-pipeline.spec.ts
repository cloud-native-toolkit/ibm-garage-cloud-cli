import {Container} from 'typescript-ioc';

import {RegisterIksPipeline} from './register-iks-pipeline';
import {KubeSecret} from '../../../api/kubectl';
import {FsPromises} from '../../../util/file-util';
import Mock = jest.Mock;
import {factoryFromValue} from '../../../testHelper';

jest.mock('superagent');
const superagent = require('superagent');

describe('register-iks-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given RegisterIksPipeline', () => {
    let classUnderTest: RegisterIksPipeline;
    let mock_readFile: Mock;

    beforeEach(() => {
      Container.bind(KubeSecret).factory(factoryFromValue({}));

      mock_readFile = jest.fn();
      Container.bind(FsPromises).factory(factoryFromValue({readFile: mock_readFile}));

      classUnderTest = Container.get(RegisterIksPipeline);
    });

    describe('generateJenkinsCrumbHeader', () => {
      const jenkinsAccess = {
        url: 'jenkins url',
        api_token: 'api token',
        username: 'jenkins admin',
        password: 'jenkins password',
      } as any;

      describe('when successful', () => {
        test('should return Jenkins-Crumb', async () => {
          const expectedResult = 'crumb';
          const crumbRequestField = 'MyCrumb';

          superagent.__setMockResponse({
            status: 200,
            body: {crumb: expectedResult, crumbRequestField},
          });

          const actualResult = await classUnderTest.generateJenkinsCrumbHeader(jenkinsAccess);

          expect(actualResult[crumbRequestField]).toEqual(expectedResult);
          expect(superagent.get.mock.calls[0][0]).toMatch(new RegExp(`^${jenkinsAccess.url}.*`));
          expect(superagent.auth).toBeCalledWith(jenkinsAccess.username, jenkinsAccess.api_token);
          expect(superagent.set.mock.calls[0][0]).toEqual('User-Agent');
        });
      });

      describe('when not successful', () => {
        test('should throw error', async () => {
          const expectedResult = 'error text';

          (superagent as any).__setMockResponse({
            status: 400,
            text: expectedResult
          });

          return classUnderTest.generateJenkinsCrumbHeader(jenkinsAccess)
            .then(() => fail('should throw error'))
            .catch(err => {
              expect(err.message).toEqual(`Unable to generate Jenkins crumb: ${expectedResult}`);

              expect((superagent.get as Mock).mock.calls[0][0]).toMatch(new RegExp(`^${jenkinsAccess.url}.*`));
              expect((superagent as any).auth.mock.calls[0]).toEqual([jenkinsAccess.username, jenkinsAccess.api_token]);
              expect((superagent as any).set.mock.calls[0][0]).toEqual('User-Agent');
            });
        });
      });
    });

    describe('buildJenkinsJobConfig()', () => {
      beforeEach(() => {
        mock_readFile.mockResolvedValue(`<test>
<value1>{{GIT_REPO}}</value1>
<value2>{{GIT_CREDENTIALS}}</value2>
<value3>{{GIT_BRANCH}}</value3>
<value4>{{NAMESPACE}}</value4>
</test>`);
      });

      describe('when git params provided', () => {
        const gitParams = {
          name: 'name',
          url: 'chdkktdoogyyd943djd',
          username: 'username',
          password: 'password',
          branch: 'master',
          owner: 'org',
          repo: 'repo',
        };
        const credentialsName = 'credentialsName';
        const namespace = 'big-namespace1';

        test('replace {{GIT_REPO}} with gitParams.url', async () => {

          const result = await classUnderTest.buildJenkinsPipelineConfig(gitParams, 'pipeline', credentialsName, namespace);

          expect(result).not.toContain('{{GIT_REPO}}');
          expect(result).toContain(gitParams.url);
        });

        test('replace {{GIT_CREDENTIALS}} with credentialsName', async () => {

          const result = await classUnderTest.buildJenkinsPipelineConfig(gitParams, 'pipeline', credentialsName, namespace);

          expect(result).not.toContain('{{GIT_CREDENTIALS}}');
          expect(result).toContain(credentialsName);
        });

        test('replace {{GIT_BRANCH}} with gitParams.branch', async () => {

          const result = await classUnderTest.buildJenkinsPipelineConfig(gitParams, 'pipeline', credentialsName, namespace);

          expect(result).not.toContain('{{GIT_BRANCH}}');
          expect(result).toContain(gitParams.branch);
        });

        test('replace {{NAMESPACE}} with gitParams.branch', async () => {

          const result = await classUnderTest.buildJenkinsPipelineConfig(gitParams, 'pipeline', credentialsName, namespace);

          expect(result).not.toContain('{{NAMESPACE}}');
          expect(result).toContain(namespace);
        });

        test('replace all {{xxx}} references with values', async () => {

          const result = await classUnderTest.buildJenkinsPipelineConfig(gitParams, 'pipeline', credentialsName, namespace);

          expect(result).not.toMatch(/{{.*}}/);
        });
      })
    });
  });
});
