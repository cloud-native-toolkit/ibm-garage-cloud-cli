import rewire = require('rewire');
import {encode as base64encode} from '../../util/base64';

const secrets = rewire('./secrets');

const getSecretData = secrets.__get__('getSecretData');

describe('secrets', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getSecretData()', () => {
    let mock_buildKubeClient;
    let unset_buildKubeClient;

    let mock_namespace;
    let mock_secrets;
    let mock_get;

    beforeEach(() => {
      mock_buildKubeClient = jest.fn();
      unset_buildKubeClient = secrets.__set__('buildKubeClient', mock_buildKubeClient);

      mock_namespace = jest.fn();
      mock_secrets = jest.fn();
      mock_get = jest.fn();

      const mock_client = {
        api: {
          v1: {
            namespace: mock_namespace,
            namespaces: mock_namespace
          }
        }
      };

      mock_buildKubeClient.mockReturnValue(mock_client);
      mock_namespace.mockReturnValue({secrets: mock_secrets, secret: mock_secrets});
      mock_secrets.mockReturnValue({get: mock_get});
    });

    afterEach(() => {
      unset_buildKubeClient();
    });

    describe('when secret exists', () => {
      const url = 'url';
      const username = 'username';
      const password = 'password';
      const api_token = 'api_token';

      beforeEach(() => {
        mock_get.mockReturnValue(Promise.resolve({body: {data: {
              url: base64encode(url),
              username: base64encode(username),
              password: base64encode(password),
              api_token: base64encode(api_token),
            }}}));
      });

      test('return secret data', async () => {
        const secretName = 'test-secret';
        const namespace = 'ns';

        const result = await getSecretData(secretName, namespace);

        expect(result).toEqual({url, username, password, api_token});
        expect(mock_namespace.mock.calls[0][0]).toEqual(namespace);
        expect(mock_secrets.mock.calls[0][0]).toEqual(secretName);
      });
    });

    describe('when secret does not exist', () => {
      const secretName = 'test-secret';
      const namespace = 'ns';

      beforeEach(() => {
        mock_get.mockReturnValue(Promise.reject(new Error(`secrets "${secretName}" not found`)));
      });

      test('throw secret not found error', async () => {

        return getSecretData(secretName, namespace)
          .then(() => fail('should throw error'))
          .catch(err => {

            expect(err.message).toEqual(`secrets "${secretName}" not found`);

            expect(mock_namespace.mock.calls[0][0]).toEqual(namespace);
            expect(mock_secrets.mock.calls[0][0]).toEqual(secretName);
          });
      });
    });
  });
});
