import rewire = require('rewire');
import {encode} from '../../util/base64';

const module = rewire('./config-jenkins-auth');

const configJenkinsAuth = module.__get__('configJenkinsAuth');
const retrieveJenkinsPassword = module.__get__('retrieveJenkinsPassword');

describe('config-jenkins-auth', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('configJenkinsAuth()', () => {
    let mock_retrieveJenkinsPassword;
    let unset_retrieveJenkinsPassword;

    let mock_generateToken;
    let unset_generateToken;

    let mock_generateJenkinsAuthSecret;
    let unset_generateJenkinsAuthSecret;

    const host = 'host';
    const url = 'url';
    const username = 'username';
    const password = 'password';
    const apiToken = 'apiToken';
    const namespace = 'namespace';
    const expectedResult = 'result';

    beforeEach(() => {
      mock_retrieveJenkinsPassword = jest.fn();
      mock_generateToken = jest.fn();
      mock_generateJenkinsAuthSecret = jest.fn();

      unset_retrieveJenkinsPassword = module.__set__('retrieveJenkinsPassword', mock_retrieveJenkinsPassword);
      unset_generateToken = module.__set__('generateToken', mock_generateToken);
      unset_generateJenkinsAuthSecret = module.__set__('generateJenkinsAuthSecret', mock_generateJenkinsAuthSecret);
    });

    afterEach(() => {
      unset_retrieveJenkinsPassword();
      unset_generateJenkinsAuthSecret();
      unset_generateToken();
    });

    describe('when Jenkins password provided', () => {

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
          expect(mock_retrieveJenkinsPassword.mock.calls.length).toEqual(0);
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
          expect(mock_retrieveJenkinsPassword.mock.calls.length).toEqual(0);
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
          expect(mock_retrieveJenkinsPassword.mock.calls.length).toEqual(0);
          expect(mock_generateToken.mock.calls.length).toEqual(0);
          expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
        });
      });
    });

    describe('when Jenkins password not provided', () => {
      const options = {
        host,
        username,
        namespace
      };

      test('retrieve Jenkins password from existing secret', async () => {
        mock_retrieveJenkinsPassword.mockResolvedValue(password);
        mock_generateToken.mockResolvedValue(apiToken);
        mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

        const url = `http://${host}`;
        const generateTokenOptions = Object.assign({}, options, {url, username, password});

        const actualResult = await configJenkinsAuth(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_retrieveJenkinsPassword.mock.calls[0][0]).toEqual(namespace);
        expect(mock_generateToken.mock.calls[0][0]).toEqual(generateTokenOptions);
        expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
      });
    });
  });

  describe('retrieveJenkinsPassword()', () => {
    const expectedResult = 'password';

    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData);

      mock_getSecretData.mockResolvedValue({
        'jenkins-admin-password': expectedResult
      });
    });

    afterEach(() => {
      unset_getSecretData();
    });

    describe('when namespace not provided', () => {
      test('should call getSecretData() for "jenkins" secret in "tools" namespace', async () => {

        const actualResult = await retrieveJenkinsPassword();

        expect(mock_getSecretData.mock.calls[0][0]).toEqual('jenkins');
        expect(mock_getSecretData.mock.calls[0][1]).toEqual('tools');
      });

      test('should retrieve password from secret', async () => {

        const actualResult = await retrieveJenkinsPassword();

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when namespace is provided', () => {
      const namespace = 'namespace';

      test('should call getSecretData() for "jenkins" secret in provided namespace', async () => {

        const actualResult = await retrieveJenkinsPassword(namespace);

        expect(mock_getSecretData.mock.calls[0][0]).toEqual('jenkins');
        expect(mock_getSecretData.mock.calls[0][1]).toEqual(namespace);
      });

      test('should retrieve password from secret', async () => {

        const actualResult = await retrieveJenkinsPassword(namespace);

        expect(actualResult).toEqual(expectedResult);
      });
    });
  });
});
