import {Container} from 'typescript-ioc';
import {KubeSecret} from '../../api/kubectl';
import {JenkinsAuth, JenkinsAuthImpl} from './config-jenkins-auth';
import {setField, providerFromValue} from '../../testHelper';
import {GenerateToken, GenerateTokenOptions} from '../generate-token';
import {KubeIngress} from '../../api/kubectl/ingress';
import Mock = jest.Mock;

describe('config-jenkins-auth', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given JenkinsAuth', () => {
    let classUnderTest: JenkinsAuthImpl;

    let mock_generateToken: Mock;
    let mock_create: Mock;
    let mock_getSecretData: Mock;
    let mock_getIngressHosts: Mock;
    let mock_getIngressUrls: Mock;

    beforeEach(() => {
      mock_generateToken = jest.fn();
      Container.bind(GenerateToken).provider(providerFromValue({generateToken: mock_generateToken}));

      mock_create = jest.fn();
      mock_getSecretData = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({
        createOrUpdate: mock_create,
        getData: mock_getSecretData,
      }));

      mock_getIngressHosts = jest.fn();
      mock_getIngressUrls = jest.fn();
      Container.bind(KubeIngress).provider(providerFromValue({
        getHosts: mock_getIngressHosts,
        getUrls: mock_getIngressUrls,
      }));

      classUnderTest = Container.get(JenkinsAuth);
    });

    test('classUnderTest should be defined', () => {
      expect(classUnderTest).not.toBeUndefined();
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

        unset_retrieveJenkinsCredentials = setField(classUnderTest, 'retrieveJenkinsCredentials', mock_retrieveJenkinsCredentials);
        unset_retrieveJenkinsUrl = setField(classUnderTest, 'retrieveJenkinsUrl', mock_retrieveJenkinsUrl);
        unset_retrieveJenkinsApiToken = setField(classUnderTest, 'retrieveJenkinsApiToken', mock_retrieveJenkinsApiToken);
        unset_generateJenkinsAuthSecret = setField(classUnderTest, 'generateJenkinsAuthSecret', mock_generateJenkinsAuthSecret);
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
        const options = {} as any;

        test('should get Jenkins password, url, and apiToken then generate secret', async () => {

          expect(await classUnderTest.configJenkinsAuth(options)).toEqual(expectedResult);

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

            const actualResult = await classUnderTest.configJenkinsAuth(options);

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

            const actualResult = await classUnderTest.configJenkinsAuth(options);

            expect(actualResult).toEqual(expectedResult);
            expect(mock_retrieveJenkinsCredentials.mock.calls.length).toEqual(0);
            expect(mock_retrieveJenkinsApiToken.mock.calls.length).toEqual(0);
            expect(mock_generateJenkinsAuthSecret.mock.calls[0]).toEqual([host, url, username, password, apiToken]);
          });
        });
      });

      describe('when Jenkins password not provided', () => {
        const options = {
          host,
          username,
          namespace
        } as any;

        test('retrieve Jenkins password from existing secret', async () => {
          mock_retrieveJenkinsCredentials.mockResolvedValue({username, password});
          mock_retrieveJenkinsUrl.mockResolvedValue({host, url});
          mock_retrieveJenkinsApiToken.mockResolvedValue(apiToken);
          mock_generateJenkinsAuthSecret.mockResolvedValue(expectedResult);

          const generateTokenOptions = Object.assign({}, options, {url, username, password});

          const notifyStatus = () => {};
          const actualResult = await classUnderTest.configJenkinsAuth(options, notifyStatus);

          expect(actualResult).toEqual(expectedResult);
          expect(mock_retrieveJenkinsCredentials).toHaveBeenCalledWith(options, notifyStatus);
          expect(mock_retrieveJenkinsApiToken).toHaveBeenCalledWith({url, username, password}, notifyStatus);
          expect(mock_generateJenkinsAuthSecret).toHaveBeenCalledWith({host, url, username, password, apiToken}, notifyStatus);
        });
      });
    });

    describe('retrieveJenkinsCredentials()', () => {
      const username = 'username';
      const password = 'password';

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

          const result = await classUnderTest.retrieveJenkinsCredentials({username, password});

          expect(result).toEqual({username, password});
          expect(mock_getSecretData.mock.calls.length).toEqual(0);
        });
      });

      describe('when namespace not provided', () => {
        test('default namespace to "tools"', async () => {
          await classUnderTest.retrieveJenkinsCredentials();

          expect(mock_getSecretData.mock.calls[0][1]).toEqual('tools');
        });
      });

      describe('when namespace provided', () => {
        test('use provided namespace', async () => {
          const namespace = 'namespace';

          await classUnderTest.retrieveJenkinsCredentials({namespace});

          expect(mock_getSecretData.mock.calls[0][1]).toEqual(namespace);

        });
      });

      describe('when password not provided', () => {
        test('get username and password from secret', async () => {
          const result = await classUnderTest.retrieveJenkinsCredentials({username: 'user'});

          expect(result).toEqual({username, password});
        });
      });

      describe('when username not provided', () => {
        test('get username and password from secret', async () => {
          const result = await classUnderTest.retrieveJenkinsCredentials({password: 'pwd'});

          expect(result).toEqual({username, password});
        });
      });
    });

    describe('retrieveJenkinsUrl()', () => {
      const host = 'host';
      const url = 'url';

      describe('when host and url provided', () => {
        test('return provided host and url', async () => {
          const result = await classUnderTest.retrieveJenkinsUrl({host, url});

          expect(result).toEqual({host, url});
        });
      });

      describe('when host provided and url not provided', () => {
        test('return `http://${host} for url`', async () => {
          mock_getIngressUrls.mockResolvedValue([]);

          const result = await classUnderTest.retrieveJenkinsUrl({host});

          expect(result).toEqual({host, url: `http://${host}`});
        });
      });

      describe('when host and namespace not provided', () => {
        test('get host from ingress in "tools" namespace', async () => {
          mock_getIngressHosts.mockResolvedValue([host]);
          mock_getIngressUrls.mockResolvedValue([]);

          const result = await classUnderTest.retrieveJenkinsUrl();

          expect(result).toEqual({host, url: `http://${host}`});
          expect(mock_getIngressHosts.mock.calls[0]).toEqual(['tools', 'jenkins']);
        });
      })

      describe('when namespace provided and host not provided', () => {
        test('get host from ingress in provided namespace', async () => {
          mock_getIngressHosts.mockResolvedValue([host]);
          mock_getIngressUrls.mockResolvedValue([]);

          const namespace = 'namespace';

          const result = await classUnderTest.retrieveJenkinsUrl({namespace});

          expect(result).toEqual({host, url: `http://${host}`});
          expect(mock_getIngressHosts.mock.calls[0]).toEqual([namespace, 'jenkins']);
        });
      })
    });

    describe('retrieveJenkinsApiToken()', () => {

      describe('when jenkinsApiToken provided', () => {
        test('return jenkinsApiToken', async () => {
          const expectedResult = 'apiToken';

          const actualResult = await classUnderTest.retrieveJenkinsApiToken({jenkinsApiToken: expectedResult} as any);

          expect(actualResult).toEqual(expectedResult);
          expect(mock_generateToken.mock.calls.length).toEqual(0);
        });
      });

      describe('when jenkinsApiToken not provided', () => {
        test('return value from generateToken()', async () => {
          const expectedResult = 'apiToken';
          mock_generateToken.mockResolvedValue(expectedResult);

          const options = {} as GenerateTokenOptions;

          const actualResult = await classUnderTest.retrieveJenkinsApiToken(options);

          expect(actualResult).toEqual(expectedResult);
          expect(mock_generateToken.mock.calls[0][0]).toBe(options);
        });
      });
    });

    describe('generateJenkinsAuthSecret()', () => {
      let mock_create: Mock;
      beforeEach(() => {
        mock_create = jest.fn();

        Container.bind(KubeSecret).provider({get: () => ({createOrUpdate: mock_create})});
      });

      describe('when successful', () => {
        test('post secret', async () => {
          const expectedResult = {body: 'result'};
          mock_create.mockResolvedValue(expectedResult);

          const host = 'host';
          const url = 'url';
          const username = 'username';
          const password = 'password';
          const apiToken = 'apiToken';
          const namespace = 'namespace';

          const actualResult = await classUnderTest.generateJenkinsAuthSecret({
            host,
            url,
            username,
            password,
            apiToken,
            namespace
          });

          expect(actualResult).toEqual(expectedResult);

          const postData = mock_create.mock.calls[0][1].body;
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
});
