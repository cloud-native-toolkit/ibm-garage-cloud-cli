const rewire = require('rewire');

const createWebhook = rewire('../../../dist/commands/create-webhook/create-webhook');

const gitApiUrl = createWebhook.__get__('gitApiUrl');
const buildGitUrl = createWebhook.__get__('buildGitUrl');
const parseGitSlug = createWebhook.__get__('parseGitSlug');

describe('create-webhook', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('buildGitUrl()', () => {
    const apiUrl = 'apiUrl';
    const owner = 'owner';
    const repo = 'repo';

    let mockGitApiUrl;
    let unset_gitApiUrl;

    let mockParseGitSlug;
    let unset_parseGitSlug;

    beforeEach(() => {
      mockGitApiUrl = jest.fn();
      mockGitApiUrl.mockReturnValue(apiUrl);
      unset_gitApiUrl = createWebhook.__set__('gitApiUrl', mockGitApiUrl);

      mockParseGitSlug = jest.fn();
      mockParseGitSlug.mockReturnValue({owner, repo});
      unset_parseGitSlug = createWebhook.__set__('parseGitSlug', mockParseGitSlug);
    });

    afterEach(() => {
      unset_gitApiUrl();
      unset_parseGitSlug();
    });

    test('when called then return {apiUrl}/repos/{gitOwner}/{gitRepo}/hooks', () => {

      const options = {
        gitUrl: 'gitUrl'
      };
      const actual = buildGitUrl(options);

      expect(actual).toEqual(`${apiUrl}/repos/${owner}/${repo}/hooks`);
      expect(mockGitApiUrl.mock.calls[0][0]).toBe(options.gitUrl);
    });
  });

  describe('parseGitSlug()', () => {
    describe('when url is invalid', () => {
      const url = `bogus-url`;

      test('throw error', () => {
        expect(() => parseGitSlug(url)).toThrow(new Error('Invalid url'));
      });
    });

    describe('when url is https://github.com/owner/repo', () => {
      const owner = 'owner';
      const repo = 'repo';
      const url = `https://github.com/${owner}/${repo}`;

      test('return {owner: "owner", repo: "repo"}', () => {
        expect(parseGitSlug(url)).toEqual({owner, repo});
      });
    });

    describe('when url is http://github.com/owner/repo', () => {
      const owner = 'owner';
      const repo = 'repo';
      const url = `http://github.com/${owner}/${repo}`;

      test('return {owner: "owner", repo: "repo"}', () => {
        expect(parseGitSlug(url)).toEqual({owner, repo});
      });
    });

    describe('when url is https://github.ibm.com/owner/repo', () => {
      const owner = 'owner';
      const repo = 'repo';
      const url = `https://github.ibm.com/${owner}/${repo}`;

      test('return {owner: "owner", repo: "repo"}', () => {
        expect(parseGitSlug(url)).toEqual({owner, repo});
      });
    });
  });

  describe('gitApiUrl()', () => {
    test('when gitUrl is https://github.com then use https://api.github.com', () => {
      expect(gitApiUrl('https://github.com')).toEqual('https://api.github.com');
    });

    test('when gitUrl is https://github.ibm.com then use https://github.ibm.com/api/v3', () => {
      expect(gitApiUrl('https://github.ibm.com')).toEqual('https://github.ibm.com/api/v3');
    })
  });
});
