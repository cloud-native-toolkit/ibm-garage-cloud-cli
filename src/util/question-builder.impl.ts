import inquirer, {ChoiceOptions, ListQuestion, prompt, Question} from 'inquirer';
import {QuestionBuilder} from './question-builder.api';

function isChoiceOption<T>(choice: ChoiceOptions<T>): choice is ChoiceOptions<T> {
  return choice && !!(choice as ChoiceOptions<T>).value;
}

export class QuestionBuilderImpl<T = any> extends QuestionBuilder<T> {
  readonly _questions: Array<Question<T>> = [];
  readonly answers: T = {} as any;

  question(question: Question<T> | ListQuestion<T>, value?: string): QuestionBuilder<T> {
    if (!this.valueProvided(question, value)) {
      this._questions.push(question);
    } else {
      this.answers[question.name as string] = value;
    }

    return this;
  }

  valueProvided(
    question: Question<T> | ListQuestion<T>,
    value?: string,
  ): boolean {

    const choiceValues: string[] = this.getChoiceValues(question);

    if (choiceValues.length > 0) {
      return choiceValues.includes(value);
    } else {
      return value !== undefined && value !== null;
    }
  }

  getChoiceValues(question: Question<T> | ListQuestion<T>): string[] {
    const choices = (((question as ListQuestion<T>).choices) as Array<ChoiceOptions<T>>) || [];

    return choices
      .map(this.mapChoiceTypeToValue)
      .filter(value => value !== undefined);
  }

  mapChoiceTypeToValue(choice: ChoiceOptions<T> | string): string | undefined {
    if (typeof choice === 'string') {
      return choice;
    } else if (isChoiceOption(choice)) {
      return choice.value;
    } else {
      return;
    }
  }

  async prompt(): Promise<T> {
    const promptValues = this._questions.length > 0 ? await prompt(this._questions) : {};

    return Object.assign({}, this.answers, promptValues);
  }
}
