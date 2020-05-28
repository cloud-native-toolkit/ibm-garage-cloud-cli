import {Container} from 'typescript-ioc';
import Mock = jest.Mock;

import {OpenshiftCommands} from './commands';
import {ChildProcess} from '../../util/child-process';
import {factoryFromValue} from '../../testHelper';

describe('commands', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given OpenShiftCommands', () => {
    let classUnderTest: OpenshiftCommands;
    let mock_spawnPromise: Mock;

    beforeEach(() => {
      mock_spawnPromise = jest.fn();
      Container.bind(ChildProcess).factory(factoryFromValue({spawn: mock_spawnPromise}));

      classUnderTest = Container.get(OpenshiftCommands);
    });

    describe('startBuild()', () => {
      test('should execute `oc start-build` for given file name and namespace', async () => {
        const pipelineName = 'pipelineName';
        const namespace = 'namespace';

        await classUnderTest.startBuild(pipelineName, namespace);

        expect(mock_spawnPromise).toHaveBeenCalledWith(
          'oc',
          ['start-build', pipelineName, '-n', namespace],
          {
            env: process.env
          },
          false,
        );
      });
    });

    describe('apply()', () => {
      test('should execute `oc apply` for given file name and namespace', async () => {
        const namespace = 'namespace';
        const fileName = 'file.json';

        await classUnderTest.apply(fileName, namespace);

        expect(mock_spawnPromise).toHaveBeenCalledWith(
          'oc',
          ['apply', '-n', namespace, '-f', fileName],
          {
            env: process.env
          },
          false,
        );
      });
    });

    describe('create()', () => {
      test('should execute `oc create` for given file name and namespace', async () => {
        const namespace = 'namespace';
        const fileName = 'file.json';

        await classUnderTest.create(fileName, namespace);

        expect(mock_spawnPromise).toHaveBeenCalledWith(
          'oc',
          ['create', '-n', namespace, '-f', fileName],
          {
            env: process.env
          },
          false,
        );
      });
    });
  });
});
