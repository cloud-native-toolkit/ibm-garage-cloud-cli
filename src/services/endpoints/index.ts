import {Container} from 'typescript-ioc';
import {GetEndpoints} from './endpoints.api';
import {GetEndpointsImpl} from './endpoints';

export * from './endpoints.api';

Container.bind(GetEndpoints).to(GetEndpointsImpl);

export const buildGetEndpoints = (): GetEndpoints => Container.get(GetEndpoints);
