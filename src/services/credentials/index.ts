import {Container} from 'typescript-ioc';
import {Credentials} from './credentials.api';
import {CredentialsImpl} from './credentials';

export * from './credentials.api';

Container.bind(Credentials).to(CredentialsImpl);
