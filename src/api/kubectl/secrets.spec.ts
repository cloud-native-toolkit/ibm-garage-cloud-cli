import {Container} from 'typescript-ioc';

import {encode as base64encode} from '../../util/base64';
import {KubeClient} from './client';
import {mockKubeClientFactory} from './testHelper';
import {KubeSecret} from './secrets';
import {setField} from '../../testHelper';
import Mock = jest.Mock;

describe('secrets', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: KubeSecret;
  beforeEach(() => {
    Container
      .bind(KubeClient)
      .factory(mockKubeClientFactory);

    classUnderTest = Container.get(KubeSecret);
  });

  describe('given type', () => {
    test('should be `secrets`', () => {
      expect(classUnderTest.name).toEqual('secrets');
    });
  });

  describe('given getData()', () => {
    let mock_get: Mock;
    let unset_get: () => void;

    beforeEach(() => {
      mock_get = jest.fn();
      unset_get = setField(classUnderTest, 'get', mock_get);
    });

    afterEach(() => {
      if (unset_get) {
        unset_get();
      }
    });

    describe('when secret exists', () => {
      const url = 'url';
      const username = 'username';
      const password = 'password';
      const api_token = 'api_token';

      beforeEach(() => {
        mock_get.mockReturnValue(Promise.resolve({data: {
              url: base64encode(url),
              username: base64encode(username),
              password: base64encode(password),
              api_token: base64encode(api_token),
            }}));
      });

      test('return secret data', async () => {
        const secretName = 'test-secret';
        const namespace = 'ns';

        const result = await classUnderTest.getData(secretName, namespace);

        expect(result).toEqual({url, username, password, api_token});
        expect(mock_get).toBeCalledWith(secretName, namespace);
      });
    });

    describe('when secret does not exist', () => {
      const secretName = 'test-secret';
      const namespace = 'ns';

      beforeEach(() => {
        mock_get.mockReturnValue(Promise.reject(new Error(`secrets "${secretName}" not found`)));
      });

      test('throw secret not found error', async () => {

        return classUnderTest.getData(secretName, namespace)
          .then(() => fail('should throw error'))
          .catch(err => {

            expect(err.message).toEqual(`secrets "${secretName}" not found`);

            expect(mock_get).toBeCalledWith(secretName, namespace);
          });
      });
    });
  });
});
