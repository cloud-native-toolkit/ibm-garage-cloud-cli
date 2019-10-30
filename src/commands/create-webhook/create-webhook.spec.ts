import {Container} from 'typescript-ioc';
import {
  CreateWebhook,
  CreateWebhookImpl,
  GitEvents,
  GitHookData,
  GitHookUrlVerification,
  GitlabHookData
} from './create-webhook';
import {setField} from '../../testHelper';
import * as superagent from 'superagent';
import {CreateWebhookOptions} from './create-webhook-options.model';

jest.mock('superagent');

describe('create-webhook', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given CreateWebhook', () => {
    let classUnderTest: CreateWebhookImpl;

    beforeEach(() => {
      classUnderTest = Container.get(CreateWebhook);
    });

    describe('given createWebhook()', () => {
      let mock_gitApiUrl;
      let unset_gitApiUrl;

      let mock_buildGitUrl;
      let unset_buildGitUrl;

      let mock_buildGitlabHookData;
      let unset_buildGitlabHookData;

      let mock_buildGitWebhookData;
      let unset_buildGitWebhookData;

      let mock_parseGitSlug;
      let unset_parseGitSlug;

      beforeEach(() => {
        mock_gitApiUrl = jest.fn();
        unset_gitApiUrl = setField(classUnderTest, 'gitApiUrl', mock_gitApiUrl) as () => void;

        mock_buildGitUrl = jest.fn();
        unset_buildGitUrl = setField(classUnderTest, 'buildGitUrl', mock_buildGitUrl) as () => void;

        mock_buildGitlabHookData = jest.fn();
        unset_buildGitlabHookData = setField(classUnderTest, 'buildGitlabHookData', mock_buildGitlabHookData) as () => void;

        mock_buildGitWebhookData = jest.fn();
        unset_buildGitWebhookData = setField(classUnderTest, 'buildGitWebhookData', mock_buildGitWebhookData) as () => void;

        mock_parseGitSlug = jest.fn();
        unset_parseGitSlug = setField(classUnderTest, 'parseGitSlug', mock_parseGitSlug) as () => void;
      });

      afterEach(() => {
        unset_buildGitUrl();
        unset_buildGitWebhookData();
      });

      describe('when creating for gitlab url', () => {
        beforeEach(() => {
          mock_gitApiUrl.mockReturnValue({url: 'my url', type: 'gitlab'});;
        });

        test('then return id from response body', async () => {
          const id = 'my id';
          (superagent as any).__setMockResponse({
            status: 200,
            body: {
              id,
            },
          });

          const options: CreateWebhookOptions = {
            jenkinsUrl: 'jenkinsUrl',
            jenkinsUser: 'user',
            jenkinsPassword: 'password',
            gitUrl: 'gitUrl',
            gitUsername: 'username',
            gitToken: 'token',
            jobName: 'jobName',
          };

          const result = await classUnderTest.createWebhook(options);

          expect(result).toEqual(id);
          expect(mock_buildGitUrl).toHaveBeenCalledWith(options);
          expect(mock_buildGitlabHookData).toHaveBeenCalled();
          expect((superagent as any).accept).toHaveBeenCalledWith('application/json');
          expect((superagent as any).set).toHaveBeenCalledWith({'Private-Token': options.gitToken})
        });
      });

      describe('when creating for github url', () => {
        beforeEach(() => {
          mock_gitApiUrl.mockReturnValue({url: 'my url', type: 'github'});
        });

        test('then return id from response body', async () => {
          const id = 'my id';
          (superagent as any).__setMockResponse({
            status: 200,
            body: {
              id,
            },
          });

          const options: CreateWebhookOptions = {
            jenkinsUrl: 'jenkinsUrl',
            jenkinsUser: 'user',
            jenkinsPassword: 'password',
            gitUrl: 'gitUrl',
            gitUsername: 'username',
            gitToken: 'token',
            jobName: 'jobName',
          };

          const result = await classUnderTest.createWebhook(options);

          expect(result).toEqual(id);
          expect(mock_buildGitUrl).toHaveBeenCalledWith(options);
          expect(mock_buildGitWebhookData).toHaveBeenCalled();
          expect((superagent as any).accept).toHaveBeenCalledWith('application/vnd.github.v3+json');
          expect((superagent as any).set).toHaveBeenCalledWith({'Authorization': `token ${options.gitToken}`})
        });
      });
    });

    describe('given buildGitUrl()', () => {
      const apiUrl = 'apiUrl';
      const owner = 'owner';
      const repo = 'repo';
      const host = 'host';
      const protocol = 'protocol';

      let mock_gitApiUrl;
      let unset_gitApiUrl;

      let mock_parseGitSlug;
      let unset_parseGitSlug;

      let gitSlug;

      beforeEach(() => {
        mock_gitApiUrl = jest.fn();
        unset_gitApiUrl = setField(classUnderTest, 'gitApiUrl', mock_gitApiUrl);

        mock_parseGitSlug = jest.fn();
        gitSlug = {protocol, host, owner, repo};
        mock_parseGitSlug.mockReturnValue(gitSlug);
        unset_parseGitSlug = setField(classUnderTest, 'parseGitSlug', mock_parseGitSlug);
      });

      afterEach(() => {
        unset_gitApiUrl();
        unset_parseGitSlug();
      });

      describe('when api is gitlab type', () => {
        test('then return {apiUrl}/repos/{gitOwner}/{gitRepo}/hooks', () => {
          mock_gitApiUrl.mockReturnValue({url: apiUrl, type: 'gitlab'});

          const options = {
            gitUrl: 'gitUrl'
          } as any;
          const actual = classUnderTest.buildGitUrl(options);

          expect(actual).toEqual(`${apiUrl}/projects/${owner}%2F${repo}/hooks`);
          expect(mock_gitApiUrl.mock.calls[0][0]).toBe(gitSlug);
        });
      });

      describe('when api is not gitlab type', () => {
        test('then return {apiUrl}/repos/{gitOwner}/{gitRepo}/hooks', () => {
          mock_gitApiUrl.mockReturnValue({url: apiUrl, type: 'github'});

          const options = {
            gitUrl: 'gitUrl'
          } as any;
          const actual = classUnderTest.buildGitUrl(options);

          expect(actual).toEqual(`${apiUrl}/repos/${owner}/${repo}/hooks`);
          expect(mock_gitApiUrl.mock.calls[0][0]).toBe(gitSlug);
        });
      });
    });

    describe('given parseGitSlug()', () => {
      describe('when url is invalid', () => {
        const url = `bogus-url`;

        test('throw error', () => {
          expect(() => classUnderTest.parseGitSlug(url)).toThrowError(`Invalid url: ${url}`);
        });
      });

      describe('when url is https://github.com/owner/repo', () => {
        const host = `github.com`;
        const owner = 'owner';
        const repo = 'repo';
        const protocol = `https`;
        const url = `${protocol}://${host}/${owner}/${repo}`;

        test('return {owner: "owner", repo: "repo", host: "host"}', () => {
          expect(classUnderTest.parseGitSlug(url)).toEqual({protocol, owner, repo, host});
        });
      });

      describe('when url is http://github.com/owner/repo', () => {
        const owner = 'owner';
        const repo = 'repo';
        const host = `github.com`;
        const protocol = `http`;
        const url = `${protocol}://${host}/${owner}/${repo}`;

        test('return {owner: "owner", repo: "repo", host: "host"}', () => {
          expect(classUnderTest.parseGitSlug(url)).toEqual({protocol, host, owner, repo});
        });
      });

      describe('when url is https://github.ibm.com/owner/repo', () => {
        const owner = 'owner';
        const repo = 'repo';
        const host = `github.ibm.com`;
        const protocol = `https`;
        const url = `${protocol}://${host}/${owner}/${repo}`;

        test('return {owner: "owner", repo: "repo", host: "host", protocol: "protocol"}', () => {
          expect(classUnderTest.parseGitSlug(url)).toEqual({protocol, host, owner, repo});
        });
      });
    });

    describe('given gitApiUrl()', () => {
      test('when gitUrl is https://github.com then use https://api.github.com', () => {
        expect(classUnderTest.gitApiUrl({protocol: 'https', host: 'github.com'}))
          .toEqual({url: 'https://api.github.com', type: 'github'});
      });

      test('when gitUrl is https://github.ibm.com then use https://github.ibm.com/api/v3', () => {
        expect(classUnderTest.gitApiUrl({protocol: 'https', host: 'github.ibm.com'}))
          .toEqual({url: 'https://github.ibm.com/api/v3', type: 'ghe'});
      });

      test('when gitUrl is https://us-south.git.cloud.ibm.com then use https://us-south.git.cloud.ibm.com/api.v4', () => {
        expect(classUnderTest.gitApiUrl({protocol: 'https', host: 'us-south.git.cloud.ibm.com'}))
          .toEqual({url: 'https://us-south.git.cloud.ibm.com/api/v4', type: 'gitlab'});
      });
    });

    describe('given buildGitWebhookData()', () => {
      describe('when called', () => {
        test('then return GitHookData', async () => {
          const jenkinsUrl = 'url';
          const gitWebhook: GitHookData = classUnderTest.buildGitWebhookData(jenkinsUrl);

          expect(gitWebhook.name).toEqual('web');
          expect(gitWebhook.events).toEqual([GitEvents.push]);
          expect(gitWebhook.active).toEqual(true);
          expect(gitWebhook.config.url).toEqual(`${jenkinsUrl}/github-webhook/`);
          expect(gitWebhook.config.content_type).toEqual('json');
          expect(gitWebhook.config.insecure_ssl).toEqual(GitHookUrlVerification.performed);
        });
      });
    });

    describe('given buildGitlabWebhookData()', () => {
      describe('when called', () => {
        test('then return GitlabHookData', async () => {
          const gitOrg = 'org';
          const gitRepo = 'repo';
          const protocol = 'http';
          const jenkinsUser = 'user';
          const jenkinsPassword = 'password';
          const host = 'jenkin-host';
          const jobName = 'org.repo';

          const jenkinsUrl = `${protocol}://${host}`;

          const hookData: GitlabHookData = classUnderTest.buildGitlabHookData({owner: gitOrg, repo: gitRepo, jenkinsUrl, jenkinsUser, jenkinsPassword, jobName});

          expect(hookData.id).toEqual(`${gitOrg}%2F${gitRepo}`);
          expect(hookData.url).toEqual(`${protocol}://${jenkinsUser}:${jenkinsPassword}@${host}/project/${jobName}`);
          expect(hookData.push_events).toEqual(true);
        });
      });
    });
  });
});
