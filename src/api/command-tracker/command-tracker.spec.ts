import {CommandTrackerImpl} from './command-tracker';
import {Container} from 'typescript-ioc';

describe('command-tracker', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: CommandTrackerImpl;
  beforeEach(() => {
    classUnderTest = Container.get(CommandTrackerImpl);
  });

  describe('given record()', () => {
    describe('when called', () => {
      test('then add the command to the list', async () => {
        const step = {command: 'test'};
        classUnderTest.record(step);

        expect(classUnderTest.commands).toContain(step);
      });
    });
  });
});