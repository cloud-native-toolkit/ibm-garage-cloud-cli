import inquirer, {ChoiceType, ListQuestion, prompt, Question} from 'inquirer';
import ChoiceOption = inquirer.objects.ChoiceOption;
import {Container, Provides} from 'typescript-ioc';

function isChoiceOption<T>(choice: ChoiceType<T>): choice is ChoiceOption<T> {
  return choice && !!(choice as ChoiceOption<T>).value;
}

export abstract class QuestionBuilder<T> {
  abstract question(question: Question<T> | ListQuestion<T>, value?: string): QuestionBuilder<T>;
  abstract async prompt(): Promise<T>;
}

@Provides(QuestionBuilder)
export class QuestionBuilderImpl<T = any> extends QuestionBuilder<T> {
  private readonly _questions: Array<Question<T>> = [];
  private readonly _values: T = {} as any;

  question(question: Question<T> | ListQuestion<T>, value?: string): QuestionBuilder<T> {
    if (!this.valueProvided(question, value)) {
      this._questions.push(question);
    } else {
      this._values[question.name] = value;
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
    const choices = (((question as ListQuestion<T>).choices) as Array<ChoiceType<T>>) || [];

    return choices.map(this.mapChoiceTypeToValue);
  }

  mapChoiceTypeToValue(choice: ChoiceType<T>): string | undefined {
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

    return Object.assign({}, this._values, promptValues);
  }
}
