import {Container} from 'typescript-ioc';
import {Namespace} from './namespace.api';
import {NamespaceImpl} from './namespace';

export * from './namespace.api';
export * from './namespace-options.model';

Container.bind(Namespace).to(NamespaceImpl);
