import {ListQuestion, Question} from 'inquirer';

export abstract class QuestionBuilder<T = any> {
  abstract question(question: Question<T> | ListQuestion<T>, value?: string): QuestionBuilder<T>;
  abstract prompt(): Promise<T>;
}
