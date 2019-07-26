import * as path from 'path';
import * as fs from 'fs';
import rewire = require('rewire');
import {GitParams} from './register-pipeline';

const module = rewire('./register-pipeline');

const getRemoteGitUrl = module.__get__('getRemoteGitUrl');
const parseGitUrl = module.__get__('parseGitUrl');
const readValuesFile = module.__get__('readValuesFile');
const getGitParameters = module.__get__('getGitParameters');
const buildGitSecretBody = module.__get__('buildGitSecretBody');
const generateJenkinsCrumbHeader = module.__get__('generateJenkinsCrumbHeader');
const buildJenkinsJobConfig = module.__get__('buildJenkinsJobConfig');
const buildCreateWebhookOptions = module.__get__('buildCreateWebhookOptions');

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('getRemoteGitUrl()', () => {
    describe('when path provided', () => {
      test('should return url for provided directory', async () => {
        const result = await getRemoteGitUrl(process.cwd());

        expect(result).toEqual('git@github.ibm.com:garage-catalyst/ibmcloud-garage-cli.git');
      });
    });

    describe('when no path provided', () => {
      test('should return url for current directory', async () => {
        const result = await getRemoteGitUrl();

        expect(result).toEqual('git@github.ibm.com:garage-catalyst/ibmcloud-garage-cli.git');
      });
    });

    describe('when not in repo directory', () => {
      test('should throw error', () => {
        return getRemoteGitUrl(path.join(process.cwd(), '..'))
          .then(() => fail('should throw Error'))
          .catch(err => expect(err.message.toLowerCase()).toContain('not a git repository'));
      });
    });
  });

  describe('readValuesFile()', () => {
    let mock_readFilePromise;
    let unset_readFilePromise;

    beforeEach(() => {
      mock_readFilePromise = jest.fn();
      unset_readFilePromise = module.__set__('readFilePromise', mock_readFilePromise);
    });

    afterEach(() => {
      unset_readFilePromise();
    });

    describe('when valuesFileName is undefined', () => {
      test('return empty object', async () => {
        expect(await readValuesFile()).toEqual({});
      });
    });

    describe('when valuesFileName contains properties (key=value)', () => {
      test('parse properties and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue('key=value');

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when valuesFileName contains json', () => {
      test('parse json and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue(JSON.stringify(expectedResult));

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when valuesFileName contains yaml', () => {
      test('parse yaml and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue("key: value");

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when file not found', () => {
      test('return empty object', async () => {
        const fileName = '/file/path';

        mock_readFilePromise.mockRejectedValue(new Error('file not found'));

        expect(await readValuesFile(fileName)).toEqual({});
      });
    });
  });

  describe('parseGitUrl', () => {
    describe('when https github url', () => {
      const org = 'org';
      const repo = 'repo';
      const url = `https://github.com/${org}/${repo}.git`;

      test('should return {url, org, repo}', () => {
        expect(parseGitUrl(url)).toEqual({url, org, repo});
      })
    });

    describe('when https ibm GHE url', () => {
      const org = 'org';
      const repo = 'repo';
      const url = `https://github.ibm.com/${org}/${repo}.git`;

      test('should return {url, org, repo}', () => {
        expect(parseGitUrl(url)).toEqual({url, org, repo});
      })
    });

    describe('when https github url without .git extension', () => {
      const org = 'org';
      const repo = 'repo';
      const host = 'github.com';
      const url = `https://${host}/${org}/${repo}.git`;
      const originalUrl = `https://github.com/${org}/${repo}`;

      test('should return {url, org, repo}', () => {
        expect(parseGitUrl(originalUrl)).toEqual({url, org, repo});
      })
    });

    describe('when ssh github url', () => {
      const org = 'org';
      const repo = 'repo';
      const host = 'github.com';
      const url = `https://${host}/${org}/${repo}.git`;
      const sshUrl = `git@${host}:${org}/${repo}.git`;

      test('should return {url, org, repo}', () => {
        expect(parseGitUrl(sshUrl)).toEqual({url, org, repo});
      })
    });

    describe('when long ssh github url', () => {
      const org = 'ibm-garage-cloud';
      const repo = 'template-watson-banking-chatbot';
      const host = 'github.com';
      const url = `https://${host}/${org}/${repo}.git`;
      const originalUrl = `git@${host}:${org}/${repo}.git`;

      test('should return {url, org, repo}', () => {
        expect(parseGitUrl(originalUrl)).toEqual({org, repo, url});
      });
    });

    describe('when invalid text for url', () => {
      test('should throw error', () => {
        expect(() => {
          parseGitUrl('invalid');
        }).toThrowError('invalid git url');
      })
    });

    describe('when invalid url', () => {
      test('should throw error', () => {
        expect(() => {
          parseGitUrl('https://bogus');
        }).toThrowError('invalid git url');
      })
    });
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

  describe('getGitParameters()', () => {
    let mock_getRemoteGitUrl;
    let unset_getRemoteGitUrl;

    let mock_parseGitUrl;
    let unset_parseGitUrl;

    let mock_prompt;
    let unset_prompt;

    beforeEach(() => {
      mock_getRemoteGitUrl = jest.fn();
      mock_parseGitUrl = jest.fn();
      mock_prompt = jest.fn();

      unset_getRemoteGitUrl = module.__set__('getRemoteGitUrl', mock_getRemoteGitUrl);
      unset_parseGitUrl = module.__set__('parseGitUrl', mock_parseGitUrl);
      unset_prompt = module.__set__('prompt', mock_prompt);
    });

    afterEach(() => {
      unset_getRemoteGitUrl();
      unset_parseGitUrl();
      unset_prompt();
    });

    describe('when called', () => {
      const url = 'url';
      const org = 'org';
      const repo = 'repo';
      const parseGitUrlResult = {
        url,
        org,
        repo,
      };

      const username = 'username';
      const password = 'password';
      const branch = 'branch';
      const answers = {
        username,
        password,
        branch
      };

      beforeEach(() => {
        mock_getRemoteGitUrl.mockReturnValue(url);
        mock_parseGitUrl.mockReturnValue(parseGitUrlResult);
        mock_prompt.mockReturnValue(answers);
      });

      test('should prompt for username, password, and branch', async () => {
        const value = await getGitParameters();

        const questions = mock_prompt.mock.calls[0][0];
        expect(questions.map(q => q.name)).toEqual(['username', 'password', 'branch']);
      });

      test('should return url and name from git url', async () => {
        const value = await getGitParameters();

        expect(value.url).toEqual(url);
        expect(value.name).toEqual(`${org}.${repo}`);
        expect(value.username).toEqual(username);
        expect(value.password).toEqual(password);

        expect(mock_parseGitUrl.mock.calls[0][0]).toBe(url);
      });

      test('should return url and name from git url', async () => {
        const value = await getGitParameters();

        expect(value.url).toEqual(url);
        expect(value.name).toEqual(`${org}.${repo}`);
        expect(value.username).toEqual(username);
        expect(value.password).toEqual(password);
        expect(value.branch).toEqual(branch);

        expect(mock_parseGitUrl.mock.calls[0][0]).toBe(url);
      });
    });
  });

  describe('generateJenkinsCrumbHeader', () => {
    const jenkinsAccess = {
      url: 'jenkins url',
      api_token: 'api token',
      username: 'jenkins admin',
      password: 'jenkins password',
    };

    let mock_get;
    let unset_get;

    let mock_auth;
    let mock_set;

    beforeEach(() => {
      mock_get = jest.fn();
      mock_auth = jest.fn();
      mock_set = jest.fn();

      unset_get = module.__set__('get', mock_get);

      mock_get.mockReturnValue({auth: mock_auth});
      mock_auth.mockReturnValue({set: mock_set});
    });

    afterEach(() => {
      unset_get();
    });

    describe('when successful', () => {
      test('should return Jenkins-Crumb', async () => {
        const expectedResult = 'crumb';

        mock_set.mockResolvedValue({
          status: 200,
          text: `Jenkins-Crumb:${expectedResult}`
        });

        const actualResult = await generateJenkinsCrumbHeader(jenkinsAccess);

        expect(actualResult['Jenkins-Crumb']).toEqual(expectedResult);
        expect(mock_get.mock.calls[0][0]).toMatch(new RegExp(`^${jenkinsAccess.url}.*`));
        expect(mock_auth.mock.calls[0]).toEqual([jenkinsAccess.username, jenkinsAccess.api_token]);
        expect(mock_set.mock.calls[0][0]).toEqual('User-Agent');
      });
    });

    describe('when not successful', () => {
      test('should throw error', async () => {
        const expectedResult = 'error text';

        mock_set.mockResolvedValue({
          status: 400,
          text: expectedResult
        });

        return generateJenkinsCrumbHeader(jenkinsAccess)
          .then(() => fail('should throw error'))
          .catch(err => {
            expect(err.message).toEqual(`Unable to generate Jenkins crumb: ${expectedResult}`);

            expect(mock_get.mock.calls[0][0]).toMatch(new RegExp(`^${jenkinsAccess.url}.*`));
            expect(mock_auth.mock.calls[0]).toEqual([jenkinsAccess.username, jenkinsAccess.api_token]);
            expect(mock_set.mock.calls[0][0]).toEqual('User-Agent');
          });
      });
    });
  });

  describe('buildJenkinsJobConfig()', () => {
    describe('when git params provided', () => {
      const gitParams = {
        name: 'name',
        url: 'chdkktdoogyyd943djd',
        username: 'username',
        password: 'password',
        branch: 'master'
      };

      test('replace {{GIT_REPO}} with gitParams.url', async () => {

        const result = await buildJenkinsJobConfig(gitParams);

        expect(result).not.toContain('{{GIT_REPO}}');
        expect(result).toContain(gitParams.url);
      });

      test('replace {{GIT_CREDENTIALS}} with gitParams.name', async () => {

        const result = await buildJenkinsJobConfig(gitParams);

        expect(result).not.toContain('{{GIT_CREDENTIALS}}');
        expect(result).toContain(gitParams.name);
      });

      test('replace {{GIT_BRANCH}} with gitParams.branch', async () => {

        const result = await buildJenkinsJobConfig(gitParams);

        expect(result).not.toContain('{{GIT_BRANCH}}');
        expect(result).toContain(gitParams.branch);
      });

      test('replace all {{xxx}} references with values', async () => {

        const result = await buildJenkinsJobConfig(gitParams);

        expect(result).not.toMatch(/{{.*}}/);
      });
    })
  });

  describe('buildCreateWebhookOptions()', () => {
    test('map GitParams to CreateWebhookOptions', () => {
      const gitParams = {
        url: 'url',
        username: 'username',
        password: 'password'
      };

      const pipelineResult = {
        jenkinsUrl: 'jenkinsUrl'
      };

      const result = buildCreateWebhookOptions(gitParams, pipelineResult);

      expect(result.gitUrl).toEqual(gitParams.url);
      expect(result.gitUsername).toEqual(gitParams.username);
      expect(result.gitToken).toEqual(gitParams.password);
      expect(result.jenkinsUrl).toEqual(pipelineResult.jenkinsUrl);
    });
  });
});
