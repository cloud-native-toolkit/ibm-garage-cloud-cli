import * as YAML from 'js-yaml';

import {parseString, splitLines, stringToStringArray} from './string-util';

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

  describe('given stringToStringArray()', () => {
    describe('when value is undefined', () => {
      test('then return an empty array', () => {
        expect(stringToStringArray(undefined)).toEqual([]);
      });
    });
    describe('when value is null', () => {
      test('then return an empty array', () => {
        expect(stringToStringArray(null)).toEqual([]);
      });
    });
    describe('when value is a simple string', () => {
      test('then return the value as a single element in an array', () => {
        const value = 'value';

        expect(stringToStringArray(value)).toEqual([value]);
      });
    });
    describe('when value contains two values separated by a comma', () => {
      test('then return an array of two values', () => {
        const value1 = 'value1';
        const value2 = 'value2';

        expect(stringToStringArray(`${value1},${value2}`)).toEqual([value1, value2]);
      });
    });
    describe('when value is a string array', () => {
      test('then return the value', () => {
        const value = ['value'];

        expect(stringToStringArray(value)).toBe(value);
      });
    });
  });

  describe('given parseString()', () => {
    describe('when provided JSON string with object', () => {
      const expectedResult = {
        test: "value",
        values: ["a", "b", "c"]
      }
      let json: string;
      beforeEach(() => {
        json = JSON.stringify(expectedResult)
      })

      test('then should parse as JSON', async () => {
        expect(await parseString(json)).toEqual(expectedResult)
      });
    });
    describe('when provided JSON string with array', () => {
      const expectedResults = [{
        test: "value",
        values: ["a", "b", "c"]
      }, {
        second: "value"
      }]
      let json: string;
      beforeEach(() => {
        json = JSON.stringify(expectedResults)
      })

      test('then should parse as JSON', async () => {
        expect(await parseString(json)).toEqual(expectedResults)
      });
    });
    describe('when provided YAML string with object', () => {
      const expectedResult = {
        test: "value",
        values: ["a", "b", "c"]
      }
      let yaml: string;
      beforeEach(() => {
        yaml = YAML.dump(expectedResult)
      })

      test('then should parse as YAML', async () => {
        expect(await parseString(yaml)).toEqual(expectedResult)
      });
    });
    describe('when provided YAML string with array', () => {
      const expectedResults = [{
        test: "value",
        values: ["a", "b", "c"]
      }, {
        second: "value"
      }]
      let yaml: string;
      beforeEach(() => {
        yaml = YAML.dump(expectedResults)
      })

      test('then should parse as YAML', async () => {
        expect(await parseString(yaml)).toEqual(expectedResults)
      });
    });

  });
});
