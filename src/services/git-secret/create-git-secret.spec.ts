import {Container} from 'typescript-ioc';
import {CreateGitSecretImpl} from './create-git-secret.impl';
import {FsPromises} from '../../util/file-util';
import {factoryFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('create-git-secret', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given CreateGitSecret', () => {

    let classUnderTest: CreateGitSecretImpl;
    let mock_readFilePromise: Mock;

    beforeEach(() => {
      mock_readFilePromise = jest.fn();
      Container.bind(FsPromises).factory(factoryFromValue({readFile: mock_readFilePromise}));

      classUnderTest = Container.get(CreateGitSecretImpl);
    });

    describe('readValuesFile()', () => {

      describe('when valuesFileName is undefined', () => {
        test('return empty object', async () => {
          expect(await classUnderTest.readValuesFile()).toEqual({});
        });
      });

      describe('when valuesFileName contains properties (key=value)', () => {
        test('parse properties and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue('key=value');

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when valuesFileName contains json', () => {
        test('parse json and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue(JSON.stringify(expectedResult));

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when valuesFileName contains yaml', () => {
        test('parse yaml and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue("key: value");

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when file not found', () => {
        test('return empty object', async () => {
          const fileName = '/file/path';

          mock_readFilePromise.mockRejectedValue(new Error('file not found'));

          expect(await classUnderTest.readValuesFile(fileName)).toEqual({});
        });
      });
    });
  });
});
