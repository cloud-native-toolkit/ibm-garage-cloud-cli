import {Container} from 'typescript-ioc';
import {FromFile} from './from-file.api';
import {FromFileImpl} from './from-file.impl';

export * from './from-file.api';

Container.bind(FromFile).to(FromFileImpl);
