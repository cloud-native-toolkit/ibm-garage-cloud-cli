import Mock = jest.Mock;
import {factoryFromValue, mockField} from '../../testHelper';
import {YqWriteImpl} from './yq-write';
import {Container} from 'typescript-ioc';
import {YqWriteOptions} from './yq-write.options';
import Mocked = jest.Mocked;
import {FsPromises} from '../../util/file-util';

describe('yq-write', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: YqWriteImpl;

  let fsMock: Mocked<FsPromises>;
  beforeEach(() => {
    fsMock = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      copyFile: jest.fn(),
    };
    Container.bind(FsPromises).factory(factoryFromValue(fsMock));

    classUnderTest = Container.get(YqWriteImpl);
  });

  describe('given writeFile()', () => {
    let setValue: Mock;
    let writeYamlFile: Mock;
    let readYamlFile: Mock;
    beforeEach(() => {
      writeYamlFile = mockField(classUnderTest, 'writeYamlFile');
      readYamlFile = mockField(classUnderTest, 'readYamlFile');
      setValue = mockField(classUnderTest, 'setValue');
    });

    describe('when called', () => {
      const val = {test: 'value'};
      const expectedResult = {test1: 'value1'};

      const file = 'filename';
      const field = 'key';
      const value = 'value';

      beforeEach(() => {
        readYamlFile.mockResolvedValue(val as any);
        setValue.mockReturnValue(expectedResult);
      });

      test('then run', async () => {

        const actualResult = await classUnderTest.write({file, field, value} as YqWriteOptions);

        expect(actualResult).toEqual(expectedResult);
        expect(readYamlFile).toHaveBeenCalledWith(file);
        expect(setValue).toHaveBeenCalledWith(val, field, value);
        expect(writeYamlFile).not.toHaveBeenCalled();
      });

      describe('when inplace is true', () => {
        test('then write the contents to the file', async () => {

          await classUnderTest.write({file, field, value, inplace: true} as YqWriteOptions);

          expect(writeYamlFile).toHaveBeenCalledWith(file, expectedResult);
        });
      });

    });

  });

  describe('given setValue()', () => {
    describe('when field is simple string', () => {
      test('then set value', async () => {
        const obj = {
          a: 'value',
        };
        const field = 'a';
        const value = 'test';

        expect(classUnderTest.setValue(obj, field, value)).toEqual({a: value});
      });
    });

    describe('when field is dotted string', () => {
      test('then set value', async () => {
        const obj = {
          a: {
            b: 'value'
          },
        };
        const field = 'a.b';
        const value = 'test';

        expect(classUnderTest.setValue(obj, field, value)).toEqual({a: {b: value}});
      });
    });

    describe('when field is jsonpath', () => {
      test('then set the value', async () => {
        const obj = {
          dependencies: [
            {
              name: 'image',
              version: '1.0.0-1',
              repository: 'https://helm.repo',
            },
            {
              name: 'image2',
              version: '1.0.0-2',
              repository: 'https://helm.repo',
            }
          ]
        };
        const field = 'dependencies[?(@.name == "image")].version';
        const value = 'version';

        expect(classUnderTest.setValue(obj, field, value))
          .toEqual({dependencies: [
            {
              name: 'image',
              version: 'version',
              repository: 'https://helm.repo'
            },
              {
                name: 'image2',
                version: '1.0.0-2',
                repository: 'https://helm.repo',
              }]});

      });

    });

  });

});
