import * as cp from 'child_process';
import {Container} from 'typescript-ioc';

import {ChildProcess} from './child-process';
import Mock = jest.Mock;
import {buildOptionWithEnvDefault} from './yargs-support';

jest.mock('child_process');

describe('child-process', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: ChildProcess;
  let cpExec: Mock;
  let cpSpawn: Mock;
  beforeEach(() => {
    classUnderTest = Container.get(ChildProcess);

    cpExec = cp.exec as any;
    cpSpawn = cp.spawn as any;
  });

  describe('given exec()', () => {
    describe('when call executes successfully', () => {
      const stdout = 'out'
      const stderr = 'err';

      beforeEach(() => {
        cpExec.mockImplementation((command, options, callback) => {
          callback(undefined, stdout, stderr);
        });
      });

      test('then call child_process.exec', async () => {
        const command = 'command';
        const options = {shell: 'val'};

        await classUnderTest.exec(command, options);

        expect(cpExec.mock.calls[0][0]).toEqual(command);
        expect(cpExec.mock.calls[0][1]).toEqual(options);
      });

      test('then resolve with stdout and stderr', async () => {
        const actualResult = await classUnderTest.exec('command', {shell: 'val'});

        expect(actualResult).toEqual({stdout, stderr});
      });
    });

    describe('when call has an error', () => {
      const expectedError = new Error('oops');

      beforeEach(() => {
        cpExec.mockImplementation((command, options, callback) => {
          callback(expectedError, '', '');
        });
      });

      test('then throw an error', async () => {
        return classUnderTest.exec('command', {})
          .then(value => fail('should throw error'))
          .catch(actualError => {
            expect(actualError).toEqual(expectedError);
          });
      });
    });
  });
});