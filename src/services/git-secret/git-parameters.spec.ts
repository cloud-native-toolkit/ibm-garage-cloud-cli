import * as path from "path";
import { Container } from 'typescript-ioc';
import { GetGitParameters, GetGitParametersImpl } from './git-parameters';
import { setField } from '../../testHelper';
import Mock = jest.Mock;

jest.mock('inquirer');

describe('git-parameters', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given GetGitParameters', () => {
    let classUnderTest: GetGitParametersImpl;

    beforeEach(() => {
      classUnderTest = Container.get(GetGitParameters);
    });

    describe('getGitParameters()', () => {
      let mock_getRemoteGitUrl: Mock;
      let unset_getRemoteGitUrl: () => void;

      let mock_parseGitUrl: Mock;
      let unset_parseGitUrl: () => void;

      let mock_prompt: Mock;

      beforeEach(() => {
        mock_getRemoteGitUrl = jest.fn();
        mock_parseGitUrl = jest.fn();

        mock_prompt = require('inquirer').prompt;

        unset_getRemoteGitUrl = setField(classUnderTest, 'getRemoteGitUrl', mock_getRemoteGitUrl);
        unset_parseGitUrl = setField(classUnderTest, 'parseGitUrl', mock_parseGitUrl);
      });

      afterEach(() => {
        unset_getRemoteGitUrl();
        unset_parseGitUrl();
      });

      describe('when called with non-master branch', () => {
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
          mock_prompt.mockResolvedValue(answers);
        });

        test('should prompt for username, password, and branch', async () => {
          const value = await classUnderTest.getGitParameters();

          const questions = mock_prompt.mock.calls[0][0];
          expect(questions.map(q => q.name)).toEqual(['username', 'password', 'branch']);
        });

        test('should return url and name from git url', async () => {
          const value = await classUnderTest.getGitParameters();

          expect(value.url).toEqual(url);
          expect(value.name).toEqual(`${org}.${repo}.${branch}`);
          expect(value.username).toEqual(username);
          expect(value.password).toEqual(password);

          expect(mock_parseGitUrl.mock.calls[0][0]).toBe(url);
        });

        test('should return url and name from git url', async () => {
          const value = await classUnderTest.getGitParameters();

          expect(value.url).toEqual(url);
          expect(value.name).toEqual(`${org}.${repo}.${branch}`);
          expect(value.username).toEqual(username);
          expect(value.password).toEqual(password);
          expect(value.branch).toEqual(branch);

          expect(mock_parseGitUrl.mock.calls[0][0]).toBe(url);
        });
      });
    });

    describe('parseGitUrl', () => {
      describe('when https github url', () => {
        const org = 'org';
        const repo = 'repo';
        const host = 'github.com';
        const url = `https://${host}/${org}/${repo}.git`;

        test('should return {url, org, repo}', () => {
          expect(classUnderTest.parseGitUrl(url)).toEqual({ url, org, repo, host });
        })
      });

      describe('when https ibm GHE url', () => {
        const org = 'org';
        const repo = 'repo';
        const host = 'github.ibm.com';
        const url = `https://${host}/${org}/${repo}.git`;

        test('should return {url, host, org, repo}', () => {
          expect(classUnderTest.parseGitUrl(url)).toEqual({ url, org, repo, host });
        })
      });

      describe('when https github url without .git extension', () => {
        const org = 'org';
        const repo = 'repo';
        const host = 'github.com';
        const url = `https://${host}/${org}/${repo}.git`;
        const originalUrl = `https://github.com/${org}/${repo}`;

        test('should return {url, host, org, repo}', () => {
          expect(classUnderTest.parseGitUrl(originalUrl)).toEqual({ url, org, repo, host });
        })
      });

      describe('when ssh github url', () => {
        const org = 'org';
        const repo = 'repo';
        const host = 'github.com';
        const url = `https://${host}/${org}/${repo}.git`;
        const sshUrl = `git@${host}:${org}/${repo}.git`;

        test('should return {url, host, org, repo}', () => {
          expect(classUnderTest.parseGitUrl(sshUrl)).toEqual({ url, org, repo, host });
        })
      });

      describe('when long ssh github url', () => {
        const org = 'ibm-garage-cloud';
        const repo = 'template-watson-banking-chatbot';
        const host = 'github.com';
        const url = `https://${host}/${org}/${repo}.git`;
        const originalUrl = `git@${host}:${org}/${repo}.git`;

        test('should return {url, host, org, repo}', () => {
          expect(classUnderTest.parseGitUrl(originalUrl)).toEqual({ org, repo, url, host });
        });
      });

      describe('when invalid text for url', () => {
        test('should throw error', () => {
          expect(() => {
            classUnderTest.parseGitUrl('invalid');
          }).toThrowError('invalid git url');
        })
      });

      describe('when invalid url', () => {
        test('should throw error', () => {
          expect(() => {
            classUnderTest.parseGitUrl('https://bogus');
          }).toThrowError('invalid git url');
        })
      });
    });

    describe.skip('getRemoteGitUrl()', () => {
      describe('when path provided', () => {
        test('should return url for provided directory', async () => {
          const result = await classUnderTest.getRemoteGitUrl(process.cwd());

          expect(result).toContain('ibm-garage-cloud/ibm-garage-cloud-cli.git');
        });
      });

      describe('when no path provided', () => {
        test('should return url for current directory', async () => {
          const result = await classUnderTest.getRemoteGitUrl();

          expect(result).toContain('ibm-garage-cloud/ibm-garage-cloud-cli.git');
        });
      });

      describe('when not in repo directory', () => {
        test('should throw error', () => {
          return classUnderTest.getRemoteGitUrl(path.join(process.cwd(), '..'))
            .then(() => fail('should throw Error'))
            .catch(err => expect(err.message.toLowerCase()).toContain('not a git repository'));
        });
      });
    });
  });
});
