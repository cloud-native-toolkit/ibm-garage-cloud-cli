import * as path from "path";
import { Container } from 'typescript-ioc';
import {GetGitParametersImpl} from './git-parameters.impl';
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
      classUnderTest = Container.get(GetGitParametersImpl);
    });

    describe('getGitParameters()', () => {
      let mock_getRemoteGitUrl: Mock;
      let unset_getRemoteGitUrl: () => void;

      let mock_prompt: Mock;

      beforeEach(() => {
        mock_getRemoteGitUrl = jest.fn();

        mock_prompt = require('inquirer').prompt;

        unset_getRemoteGitUrl = setField(classUnderTest, 'getRemoteGitUrl', mock_getRemoteGitUrl);
       });

      afterEach(() => {
        unset_getRemoteGitUrl();
      });

      describe('when called with non-master branch', () => {
        const url = 'https://host/owner/repo.git';
        const owner = 'owner';
        const repo = 'repo';
        const parseGitUrlResult = {
          url,
          owner,
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
          expect(value.name).toEqual(`${owner}.${repo}.${branch}`);
          expect(value.username).toEqual(username);
          expect(value.password).toEqual(password);
        });

        test('should return url and name from git url', async () => {
          const value = await classUnderTest.getGitParameters();

          expect(value.url).toEqual(url);
          expect(value.name).toEqual(`${owner}.${repo}.${branch}`);
          expect(value.username).toEqual(username);
          expect(value.password).toEqual(password);
          expect(value.branch).toEqual(branch);
        });
      });
    });

    describe.skip('getRemoteGitUrl()', () => {
      describe('when path provided', () => {
        test('should return url for provided directory', async () => {
          const result = await classUnderTest.getRemoteGitUrl(process.cwd());

          expect(result).toContain('ibm-garage-cloud/ibm-garage-cloud-cli');
        });
      });

      describe('when no path provided', () => {
        test('should return url for current directory', async () => {
          const result = await classUnderTest.getRemoteGitUrl();

          expect(result).toContain('ibm-garage-cloud/ibm-garage-cloud-cli');
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
