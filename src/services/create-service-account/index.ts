import {Container} from 'typescript-ioc';
import {CreateServiceAccount} from './create-service-account.api';
import {CreateServiceAccountImpl} from './create-service-account';

export * from './create-service-account.api';

Container.bind(CreateServiceAccount).to(CreateServiceAccountImpl);
