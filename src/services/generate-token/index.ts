import {Container} from 'typescript-ioc';
import {GenerateToken} from './generate-token';
import {GenerateTokenImpl} from './generate-token-impl';

export * from './generate-token';
export * from './generate-token-options.model';

Container.bind(GenerateToken).to(GenerateTokenImpl);
