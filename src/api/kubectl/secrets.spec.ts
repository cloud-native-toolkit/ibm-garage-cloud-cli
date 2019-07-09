import rewire = require('rewire');
import {encode as base64encode} from '../../util/base64';
import {buildMockKubeClient} from './testHelper';

const secrets = rewire('./secrets');

const getSecretData = secrets.__get__('getSecretData');

describe('secrets', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getSecretData()', () => {
    let unset_buildKubeClient;

    let mock_client;
    let mock_get;

    beforeEach(() => {
      mock_client = buildMockKubeClient();
      mock_get = mock_client.api.v1.namespace().secrets().get;

      unset_buildKubeClient = secrets.__set__('buildKubeClient', () => mock_client);
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
        expect(mock_client._state.namespace).toEqual(namespace);
        expect(mock_client._state.secret).toEqual(secretName);
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

            expect(mock_client._state.namespace).toEqual(namespace);
            expect(mock_client._state.secret).toEqual(secretName);
          });
      });
    });
  });
});
