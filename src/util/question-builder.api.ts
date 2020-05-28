import {ListQuestion, Question} from 'inquirer';

export abstract class QuestionBuilder<T> {
  abstract question(question: Question<T> | ListQuestion<T>, value?: string): QuestionBuilder<T>;
  abstract async prompt(): Promise<T>;
}
