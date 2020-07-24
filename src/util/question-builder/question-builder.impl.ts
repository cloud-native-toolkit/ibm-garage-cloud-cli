import {ChoiceOptions, ListQuestion, prompt, Question, registerPrompt} from 'inquirer';
import {QuestionBuilder, QuestionTypes} from './question-builder.api';

function isChoiceOption<T>(choice: ChoiceOptions<T>): choice is ChoiceOptions<T> {
  return choice && !!(choice as ChoiceOptions<T>).value;
}

registerPrompt('suggest', require('inquirer-prompt-suggest'));
registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

export class QuestionBuilderImpl<T = any> implements QuestionBuilder<T> {
  readonly _questions: Array<Question<T>> = [];
  readonly answers: T = {} as any;

  question(question: QuestionTypes<T>, value?: string): QuestionBuilder<T> {
    if (!this.valueProvided(question, value)) {
      this._questions.push(question);
    } else {
      this.answers[question.name as string] = value;
    }

    return this;
  }

  questions(questions: Array<QuestionTypes<T>>): QuestionBuilder<T> {
    questions.forEach(q => this._questions.push(q));

    return this;
  }

  hasQuestions(): boolean {
    return this._questions.length > 0;
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
