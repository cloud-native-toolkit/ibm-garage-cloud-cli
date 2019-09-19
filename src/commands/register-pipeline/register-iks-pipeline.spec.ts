import rewire = require('rewire');

const module = rewire('./register-iks-pipeline');

const generateJenkinsCrumbHeader = module.__get__('generateJenkinsCrumbHeader');
const buildJenkinsJobConfig = module.__get__('buildJenkinsJobConfig');

describe('register-iks-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
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
        const crumbRequestField = 'MyCrumb';

        mock_set.mockResolvedValue({
          status: 200,
          body: {
            '_class':'hudson.security.csrf.DefaultCrumbIssuer',
            'crumb': expectedResult,
            'crumbRequestField': crumbRequestField,
          }
        } as any);

        const actualResult = await generateJenkinsCrumbHeader(jenkinsAccess);

        expect(actualResult[crumbRequestField]).toEqual(expectedResult);
        expect(mock_get.mock.calls[0][0]).toMatch(new RegExp(`^${jenkinsAccess.url}/crumbIssuer/api/json`));
        expect(mock_auth).toHaveBeenCalledWith(jenkinsAccess.username, jenkinsAccess.api_token);
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
});
