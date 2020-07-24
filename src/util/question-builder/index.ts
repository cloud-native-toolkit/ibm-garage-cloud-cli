import {Container} from 'typescript-ioc';
import {QuestionBuilder} from './question-builder.api';
import {QuestionBuilderImpl} from './question-builder.impl';

export * from './question-builder.api';

Container.bind(QuestionBuilder).to(QuestionBuilderImpl);

