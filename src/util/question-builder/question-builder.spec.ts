import {Container} from 'typescript-ioc';
import {prompt} from 'inquirer';

import {QuestionBuilderImpl} from './question-builder.impl';
import {mockField} from '../../testHelper';
import Mock = jest.Mock;

jest.mock('inquirer');

describe('question-builder', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: QuestionBuilderImpl;
  beforeEach(() => {
    classUnderTest = Container.get(QuestionBuilderImpl);
  });

  describe('given question()', () => {
    let valueProvided: Mock;
    beforeEach(() => {
      valueProvided = mockField(classUnderTest, 'valueProvided');
    });

    describe('when the value has been provided', () => {
      beforeEach(() => {
        valueProvided.mockReturnValue(true);
      });

      test('then add the value to answers', async () => {
        const name = 'question name';
        const question = {name};
        const expectedResult = 'answer';
        classUnderTest.question(question, expectedResult);

        expect(classUnderTest.answers[name]).toEqual(expectedResult);
        expect(valueProvided).toHaveBeenCalledWith(question, expectedResult);
      });
    });

    describe('when the value has not been provided', () => {
      beforeEach(() => {
        valueProvided.mockReturnValue(false);
      });

      test('then add the question to the list of questions', async () => {
        const question = {name: 'test'};
        classUnderTest.question(question);

        expect(classUnderTest._questions).toContain(question);
      });
    });
  });

  describe('given valueProvided()', () => {
    let getChoiceValues: Mock;
    beforeEach(() => {
      getChoiceValues = mockField(classUnderTest, 'getChoiceValues');
    });

    describe('when choice values are provided', () => {
      const question = {name: 'question'};
      const choiceValues = ['first', 'second', 'third'];

      beforeEach(() => {
        getChoiceValues.mockReturnValue(choiceValues);
      });

      test('then call getChoiceValues', async () => {

        classUnderTest.valueProvided(question, choiceValues[0]);

        expect(getChoiceValues).toHaveBeenCalledWith(question);
      });

      test('then return true if the provided value is in the list of options', async () => {

        expect(classUnderTest.valueProvided(question, choiceValues[0]))
          .toEqual(true);
      });

      test('then return false if the provided value is not in the list of options', async () => {

        expect(classUnderTest.valueProvided(question, 'not in list'))
          .toEqual(false);
      });
    });

    describe('when choice values are not provided', () => {
      const question = {name: 'question'};

      beforeEach(() => {
        getChoiceValues.mockReturnValue([]);
      });

      test('then return false if value is undefined', async () => {

        expect(classUnderTest.valueProvided(question)).toEqual(false);
      });

      test('then return false if value is null', async () => {

        expect(classUnderTest.valueProvided(question, null)).toEqual(false);
      });

      test('then return true if value is defined', async () => {

        expect(classUnderTest.valueProvided(question, 'some value')).toEqual(true);
      });
    });
  });

  describe('given getChoiceValues()', () => {
    let mapChoiceTypeToValue: Mock;
    beforeEach(() => {
      mapChoiceTypeToValue = mockField(classUnderTest, 'mapChoiceTypeToValue');

      mapChoiceTypeToValue.mockImplementation(value => value);
    });

    describe('when choices are not provided', () => {
      test('then return an empty array', async () => {
        expect(classUnderTest.getChoiceValues({name: 'no choices'})).toEqual([]);
      });
    });

    describe('when choices are provided', () => {
      test('then map the values using mapChoiceTypeToValue()', async () => {
        const choices = ['one', 'two', 'three'];
        expect(classUnderTest.getChoiceValues({name: 'choices', choices}))
          .toEqual(choices);

        expect(mapChoiceTypeToValue).toHaveBeenCalledTimes(choices.length);
      });
    });

    describe('when choices contains undefined values', () => {
      test('then filter out the undefined values', async () => {
        const choices = ['one', 'two'];
        expect(classUnderTest.getChoiceValues({name: 'choices', choices: choices.concat(undefined)}))
          .toEqual(choices);
      });
    });
  });

  describe('given mapChoiceTypeToValue()', () => {
    describe('when choice is a string', () => {
      test('then return choice', async () => {
        const choiceValue = 'choice value';

        expect(classUnderTest.mapChoiceTypeToValue(choiceValue)).toEqual(choiceValue);
      });
    });

    describe('when choice is a ChoiceType', () => {
      test('then return the value of the choice type', async () => {
        const choiceValue = 'value';

        expect(classUnderTest.mapChoiceTypeToValue({value: choiceValue})).toEqual(choiceValue);
      });
    });

    describe('when choice is neither a string nor ChoiceType', () => {
      test('then return undefined', async () => {
        expect(classUnderTest.mapChoiceTypeToValue({key: 'not a ChoiceType'} as any)).toBeUndefined();
      });
    });
  });

  describe('given prompt()', () => {
    const promptValues = {key: 'value'};
    beforeEach(() => {
      (prompt as any).mockResolvedValue(promptValues);
    });

    describe('when there are unanswered questions', () => {
      const question = {name: 'question'};
      beforeEach(() => {
        classUnderTest.question(question);
      });

      test('then prompt for answers', async () => {
        const actualResult = await classUnderTest.prompt();

        expect(actualResult).toEqual(promptValues);
        expect(prompt).toHaveBeenCalledWith([question]);
      });
    });

    describe('when there are no unanswered questions', () => {
      const question = {name: 'question1'};
      const value = 'answer';
      beforeEach(() => {
        classUnderTest.question(question, value);
      });

      test('then prompt for answers', async () => {
        const actualResult = await classUnderTest.prompt();

        expect(actualResult).toEqual({question1: value});
        expect(prompt).not.toHaveBeenCalled();
      });
    });

    afterEach(() => {
      (prompt as any).mockReset();
    });
  });
});
