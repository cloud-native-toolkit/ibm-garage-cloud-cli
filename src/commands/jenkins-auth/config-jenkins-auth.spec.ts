import rewire = require('rewire');
import {buildMockKubeClient} from '../../api/kubectl/testHelper';

const module = rewire('./config-jenkins-auth');

const configJenkinsAuth = module.__get__('configJenkinsAuth');
const retrieveJenkinsCredentials = module.__get__('retrieveJenkinsCredentials');
const retrieveJenkinsUrl = module.__get__('retrieveJenkinsUrl');
const retrieveJenkinsApiToken = module.__get__('retrieveJenkinsApiToken');
const generateJenkinsAuthSecret = module.__get__('generateJenkinsAuthSecret');

describe('config-jenkins-auth', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('configJenkinsAuth()', () => {
    let mock_retrieveJenkinsCredentials;
    let unset_retrieveJenkinsCredentials;

    let mock_retrieveJenkinsUrl;
    let unset_retrieveJenkinsUrl;

    let mock_retrieveJenkinsApiToken;
    let unset_retrieveJenkinsApiToken;

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
      mock_retrieveJenkinsCredentials = jest.fn();
      mock_retrieveJenkinsUrl = jest.fn();
      mock_retrieveJenkinsApiToken = jest.fn();
      mock_generateJenkinsAuthSecret = jest.fn();

      unset_retrieveJenkinsCredentials = module.__set__('retrieveJenkinsCredentials', mock_retrieveJenkinsCredentials);
      unset_retrieveJenkinsUrl = module.__set__('retrieveJenkinsUrl', mock_retrieveJenkinsUrl);
      unset_retrieveJenkinsApiToken = module.__set__('retrieveJenkinsApiToken', mock_retrieveJenkinsApiToken);
      unset_generateJenkinsAuthSecret = module.__set__('generateJenkinsAuthSecret', mock_generateJenkinsAuthSecret);
    });

    afterEach(() => {
      unset_retrieveJenkinsCredentials();
      unset_retrieveJenkinsUrl();
      unset_retrieveJenkinsApiToken();
      unset_generateJenkinsAuthSecret();
    });

    beforeEach(() => {
      mock_retrieveJenkinsCredentials.mockResolvedValue({username, password});
      mock_retrieveJenkinsUrl.mockResolvedValue({host, url});
      mock_retrieveJenkinsApiToken.mockResolvedValue(apiToken);
      mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);
    });

    describe('when successful', () => {
      const options = {};

      test('should get Jenkins password, url, and apiToken then generate secret', async () => {

        expect(await configJenkinsAuth(options)).toEqual(expectedResult);

        expect(mock_retrieveJenkinsCredentials.mock.calls[0][0]).toBe(options);
        expect(mock_retrieveJenkinsUrl.mock.calls[0][0]).toBe(options);
        expect(mock_retrieveJenkinsApiToken.mock.calls[0][0]).toEqual({url, username, password})
        expect(mock_generateJenkinsAuthSecret.mock.calls[0][0]).toEqual({host, url, username, password, apiToken})
      });
    });

    xdescribe('when Jenkins password provided', () => {

      describe('when jenkinsApiToken not provided', () => {
        const options = {
          host,
          url,
          username,
          password
        };

        test('should call generateToken then generateJenkinsAuthSecret', async () => {
          mock_retrieveJenkinsApiToken.mockResolvedValue(apiToken);
          mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

          const actualResult = await configJenkinsAuth(options);

          expect(actualResult).toEqual(expectedResult);
          expect(mock_retrieveJenkinsCredentials.mock.calls.length).toEqual(0);
          expect(mock_retrieveJenkinsApiToken.mock.calls[0][0]).toEqual(options);
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
          expect(mock_retrieveJenkinsCredentials.mock.calls.length).toEqual(0);
          expect(mock_retrieveJenkinsApiToken.mock.calls.length).toEqual(0);
          expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
        });
      });
    });

    xdescribe('when Jenkins password not provided', () => {
      const options = {
        host,
        username,
        namespace
      };

      test('retrieve Jenkins password from existing secret', async () => {
        mock_retrieveJenkinsCredentials.mockResolvedValue(password);
        mock_retrieveJenkinsApiToken.mockResolvedValue(apiToken);
        mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

        const generateTokenOptions = Object.assign({}, options, {url, username, password});

        const actualResult = await configJenkinsAuth(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_retrieveJenkinsCredentials.mock.calls[0][0]).toEqual(namespace);
        expect(mock_retrieveJenkinsApiToken.mock.calls[0][0]).toEqual(generateTokenOptions);
        expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
      });
    });
  });

  describe('retrieveJenkinsCredentials()', () => {
    const username = 'username';
    const password = 'password';

    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData);
    });

    afterEach(() => {
      unset_getSecretData();
    });

    beforeEach(() => {
      mock_getSecretData.mockResolvedValue({
        'jenkins-admin-user': username,
        'jenkins-admin-password': password
      });
    });

    describe('when username and password are provided', () => {
      test('return provided username and password', async () => {
        const username = 'user';
        const password = 'pwd';

        const result = await retrieveJenkinsCredentials({username, password});

        expect(result).toEqual({username, password});
        expect(mock_getSecretData.mock.calls.length).toEqual(0);
      });
    });

    describe('when namespace not provided', () => {
      test('default namespace to "tools"', async () => {
        await retrieveJenkinsCredentials();

        expect(mock_getSecretData.mock.calls[0][1]).toEqual('tools');
      });
    });

    describe('when namespace provided', () => {
      test('use provided namespace', async () => {
        const namespace = 'namespace';

        await retrieveJenkinsCredentials({namespace});

        expect(mock_getSecretData.mock.calls[0][1]).toEqual(namespace);

      });
    });

    describe('when password not provided', () => {
      test('get username and password from secret', async () => {
        const result = await retrieveJenkinsCredentials({username: 'user'});

        expect(result).toEqual({username, password});
      });
    });

    describe('when username not provided', () => {
      test('get username and password from secret', async () => {
        const result = await retrieveJenkinsCredentials({password: 'pwd'});

        expect(result).toEqual({username, password});
      });
    });
  });

  describe('retrieveJenkinsUrl()', () => {
    const host = 'host';
    const url = 'url';

    let mock_getIngressHosts;
    let unset_getIngressHosts;

    beforeEach(() => {
      mock_getIngressHosts = jest.fn();
      unset_getIngressHosts = module.__set__('getIngressHosts', mock_getIngressHosts);
    });

    afterEach(() => {
      unset_getIngressHosts();
    });

    describe('when host and url provided', () => {
      test('return provided host and url', async () => {
        const result = await retrieveJenkinsUrl({host, url});

        expect(result).toEqual({host, url});
      });
    });

    describe('when host provided and url not provided', () => {
      test('return `http://${host} for url`', async () => {
        const result = await retrieveJenkinsUrl({host});

        expect(result).toEqual({host, url: `http://${host}`});
      });
    });

    describe('when host and namespace not provided', () => {
      test('get host from ingress in "tools" namespace', async () => {
        mock_getIngressHosts.mockResolvedValue([host]);

        const result = await retrieveJenkinsUrl();

        expect(result).toEqual({host, url: `http://${host}`});
        expect(mock_getIngressHosts.mock.calls[0]).toEqual(['tools', 'jenkins']);
      });
    })

    describe('when namespace provided and host not provided', () => {
      test('get host from ingress in provided namespace', async () => {
        mock_getIngressHosts.mockResolvedValue([host]);

        const namespace = 'namespace';

        const result = await retrieveJenkinsUrl({namespace});

        expect(result).toEqual({host, url: `http://${host}`});
        expect(mock_getIngressHosts.mock.calls[0]).toEqual([namespace, 'jenkins']);
      });
    })
  });

  describe('retrieveJenkinsApiToken()', () => {
    let mock_generateToken;
    let unset_generateToken;

    beforeEach(() => {
      mock_generateToken = jest.fn();
      unset_generateToken = module.__set__('generateToken', mock_generateToken);
    });

    afterEach(() => {
      unset_generateToken();
    });

    describe('when jenkinsApiToken provided', () => {
      test('return jenkinsApiToken', async () => {
        const expectedResult = 'apiToken';

        const actualResult = await retrieveJenkinsApiToken({jenkinsApiToken: expectedResult});

        expect(actualResult).toEqual(expectedResult);
        expect(mock_generateToken.mock.calls.length).toEqual(0);
      });
    });

    describe('when jenkinsApiToken not provided', () => {
      test('return value from generateToken()', async () => {
        const expectedResult = 'apiToken';
        mock_generateToken.mockResolvedValue(expectedResult);

        const options = {};

        const actualResult = await retrieveJenkinsApiToken(options);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_generateToken.mock.calls[0][0]).toBe(options);
      });
    });
  });

  describe('generateJenkinsAuthSecret()', () => {
    let mock_client;
    let unset_buildKubeClient;

    let mock_post;

    beforeEach(() => {
      mock_client = buildMockKubeClient();

      unset_buildKubeClient = module.__set__('buildKubeClient', () => mock_client);

      mock_post = mock_client.api.v1.namespaces().secrets.post;
    });

    afterEach(() => {
      unset_buildKubeClient();
    });

    describe('when successful', () => {
      test('post secret', async () => {
        const expectedResult = 'result';
        mock_post.mockResolvedValue({body: expectedResult});

        const host = 'host';
        const url = 'url';
        const username = 'username';
        const password = 'password';
        const apiToken = 'apiToken';
        const namespace = 'namespace';

        const actualResult = await generateJenkinsAuthSecret({
          host,
          url,
          username,
          password,
          apiToken,
          namespace
        });

        expect(actualResult).toEqual(expectedResult);
        expect(mock_client._state.namespace).toEqual(namespace);

        const postData = mock_post.mock.calls[0][0].body;
        expect(postData.kind).toEqual('Secret');
        expect(postData.metadata.name).toEqual('jenkins-access');
        expect(postData.stringData.username).toEqual(username);
        expect(postData.stringData.password).toEqual(password);
        expect(postData.stringData.api_token).toEqual(apiToken);
        expect(postData.stringData.url).toEqual(url);
        expect(postData.stringData.host).toEqual(host);
      });
    });
  });
});
