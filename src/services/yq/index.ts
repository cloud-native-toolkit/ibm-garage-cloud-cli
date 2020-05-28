import {Container} from 'typescript-ioc';
import {YqWrite} from './yq-write.api';
import {YqWriteImpl} from './yq-write';

export * from './yq-write.api';
export * from './yq-write.options';

Container.bind(YqWrite).to(YqWriteImpl);
