import rewire = require('rewire');
import {encode as base64encode} from '../../util/base64';
import {buildMockKubeClient} from './testHelper';

const secrets = rewire('./secrets');

const getSecretData = secrets.__get__('getSecretData');
const createSecret = secrets.__get__('createSecret');

describe('secrets', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let unset_buildKubeClient;
  let mock_client;

  beforeEach(() => {
    mock_client = buildMockKubeClient();

    unset_buildKubeClient = secrets.__set__('buildKubeClient', () => mock_client);
  });

  afterEach(() => {
    unset_buildKubeClient();
  });

  let mock_get;

  beforeEach(() => {
    mock_get = mock_client.api.v1.namespace().secrets().get;
  });

  describe('given getSecretData()', () => {

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

  xdescribe('given createSecret()', () => {
    const namespace = 'namespace';
    const secretName = 'my-secret';
    const secretBody = {};

    let mock_put;
    let mock_post;

    beforeEach(() => {
      mock_put = mock_client.api.v1.namespaces().secrets().put;
      mock_post = mock_client.api.v1.namespaces.secrets.post;
    });

    describe('when secret exists', () => {
      test('update secret with put()', async () => {
        const expectedResult = 'result';

        mock_get.mockResolvedValue('');
        mock_put.mockResolvedValue({body: expectedResult});

        const actualResult = await createSecret(namespace, secretName, secretBody);

        expect(actualResult).toEqual(expectedResult);
        expect(mock_get.mock.calls.length).toEqual(1);
        expect(mock_client._state.namespace).toEqual(namespace);
        expect(mock_client._state.secret).toEqual(secretName);
        expect(mock_put.mock.calls[0][0]).toBe(secretBody);
      });
    });

    xdescribe('when secret does not exist', () => {
      test('create secret with post()', () => {

      });
    });
  });
});
