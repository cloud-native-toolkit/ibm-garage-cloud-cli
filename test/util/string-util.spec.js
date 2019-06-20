const splitLines = require('../../dist/util/string-util').splitLines;

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
  });
});
