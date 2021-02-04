import {CheckboxQuestion, InputQuestion, ListQuestion, Question} from 'inquirer';

export interface CheckboxPlusQuestion<T> extends Omit<CheckboxQuestion<T>, 'type'> {
  type?: 'checkbox-plus',
  searchable?: boolean;
  highlight?: boolean;
  source?: (answers: T, input: any) => Promise<any[]>;
}

export interface SuggestionInputQuestion<T> extends Omit<InputQuestion<T>, 'type'> {
  type: 'suggest',
  suggestions: string[];
}

export type QuestionTypes<T> = Question<T> | ListQuestion<T> | SuggestionInputQuestion<T> | CheckboxPlusQuestion<T>;

export abstract class QuestionBuilder<T = any> {
  abstract question(question: QuestionTypes<T>, value?: string, alwaysPrompt?: boolean): QuestionBuilder<T>;
  abstract questions(questions: Array<QuestionTypes<T>>): QuestionBuilder<T>;
  abstract hasQuestions(): boolean;
  abstract prompt(): Promise<T>;
}
