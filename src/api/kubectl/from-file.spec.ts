import {Container} from 'typescript-ioc';
import {FromFileImpl} from './from-file.impl';
import {FromFile} from './from-file';
import {ChildProcess} from '../../util/child-process';
import {factoryFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('from-file', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given FromFile', () => {
    let classUnderTest: FromFileImpl;

    let mock_spawn: Mock;

    beforeEach(() => {
      mock_spawn = jest.fn();
      Container.bind(ChildProcess).factory(factoryFromValue({spawn: mock_spawn}));

      classUnderTest = Container.get(FromFile) as FromFileImpl;
    });

    describe('apply()', () => {

      test('should execute `kubectl apply` for given file name and namespace', async () => {
        const namespace = 'namespace';
        const fileName = 'file.json';

        await classUnderTest.apply(fileName, namespace);

        expect(mock_spawn).toHaveBeenCalledTimes(1);
        expect(mock_spawn).toHaveBeenCalledWith(
          'kubectl',
          ['apply', '-n', namespace, '-f', fileName],
          {env: process.env});
      });
    });

    describe('create()', () => {

      test('should execute `kubectl create` for given file name and namespace', async () => {
        const namespace = 'namespace';
        const fileName = 'file.json';

        await classUnderTest.create(fileName, namespace);

        expect(mock_spawn).toHaveBeenCalledTimes(1);
        expect(mock_spawn).toHaveBeenCalledWith(
          'kubectl',
          ['create', '-n', namespace, '-f', fileName],
          {env: process.env});
      });
    });
  });
});
