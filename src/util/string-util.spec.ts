import {splitLines} from './string-util';

describe('string-util', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given splitLines()', () => {
    describe('when string with 3 lines provided', () => {
      const value = 'one';
      const lines = `${value}\ntwo\nthree`;

      test('then return an array with 3 items', () => {
        expect(splitLines(lines).length).toEqual(3);
      });

      test('then return each array with 3 items', () => {
        expect(splitLines(lines)[0]).toEqual(value);
      });
    });

    describe('when string with 1 line provided', () => {
      test('then return an array containing the one line', () => {
        const line = 'one line';

        expect(splitLines(line)).toEqual([line]);
      });
    });

    describe('when empty string provided', () => {
      test('then return an array containing the empty string', () => {
        expect(splitLines('')).toEqual(['']);
      });
    });

    describe('when undefined string provided', () => {
      test('then return an empty array', () => {
        expect(splitLines(undefined)).toEqual([]);
      });
    });

    describe('when null string provided', () => {
      test('then return an empty array', () => {
        expect(splitLines(null)).toEqual([]);
      });
    });
  });
});
