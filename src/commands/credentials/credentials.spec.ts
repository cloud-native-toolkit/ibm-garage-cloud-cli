import rewire = require('rewire');
import {encode as base64encode} from '../../util/base64';

const credentials = rewire('./credentials');

const getJenkinsCredentials = credentials.__get__('getJenkinsCredentials');

describe('credentials', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getJenkinsCredentials()', () => {
    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = credentials.__set__('getSecretData', mock_getSecretData);
    });

    afterEach(() => {
      unset_getSecretData();
    });

    describe('when jenkins-access secret exists', () => {
      const url = 'url';
      const username = 'username';
      const password = 'password';
      const api_token = 'api_token';

      beforeEach(() => {
        mock_getSecretData.mockReturnValue({
          url,
          username,
          password,
          api_token
        });
      });

      test('return {url, username, password, api_token} from secret', async () => {
        const result = await getJenkinsCredentials();

        expect(result).toEqual({url, username, password, api_token});
      });
    });

    xdescribe('when jenkins secret exists but jenkins-access does not', () => {

    });

    xdescribe('when no jenkins secrets exist', () => {

    });
  });
});
