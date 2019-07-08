import rewire = require('rewire');

const module = rewire('./config-jenkins-auth');

const configJenkinsAuth = module.__get__('configJenkinsAuth');

describe('config-jenkins-auth', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('configJenkinsAuth()', () => {
    let mock_generateToken;
    let unset_generateToken;

    let mock_generateJenkinsAuthSecret;
    let unset_generateJenkinsAuthSecret;

    const host = 'host';
    const url = 'url';
    const username = 'username';
    const password = 'password';
    const apiToken = 'apiToken';
    const expectedResult = 'result';

    beforeEach(() => {
      mock_generateToken = jest.fn();
      mock_generateJenkinsAuthSecret = jest.fn();

      unset_generateToken = module.__set__('generateToken', mock_generateToken);
      unset_generateJenkinsAuthSecret = module.__set__('generateJenkinsAuthSecret', mock_generateJenkinsAuthSecret);
    });

    afterEach(() => {
      unset_generateJenkinsAuthSecret;
      unset_generateToken;
    });

    describe('when url not provided', () => {
      const options = {
        host,
        username,
        password
      };

      test('should call generateToken then generateJenkinsAuthSecret', async () => {
        mock_generateToken.mockResolvedValue(apiToken);
        mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

        const url = `http://${host}`;
        const generateTokenOptions = Object.assign({}, options, {url});

        const actualResult = await configJenkinsAuth(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_generateToken.mock.calls[0][0]).toEqual(generateTokenOptions);
        expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
      });
    });

    describe('when jenkinsApiToken not provided', () => {
      const options = {
        host,
        url,
        username,
        password
      };

      test('should call generateToken then generateJenkinsAuthSecret', async () => {
        mock_generateToken.mockResolvedValue(apiToken);
        mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

        const actualResult = await configJenkinsAuth(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_generateToken.mock.calls[0][0]).toEqual(options);
        expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
      });
    });

    describe('when jenkinsApiToken provided', () => {
      const options = {
        host,
        url,
        username,
        password,
        jenkinsApiToken: apiToken
      };

      test('should skip generateToken step', async () => {
        mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

        const actualResult = await configJenkinsAuth(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_generateToken.mock.calls.length).toEqual(0);
        expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
      });
    });
  });
});
