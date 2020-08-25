import {Container} from 'typescript-ioc';
import {GetDashboardUrl} from './get-dashboard-url.api';
import {GetDashboardUrlImpl} from './get-dashboard-url';

export * from './get-dashboard-url.api';

Container.bind(GetDashboardUrl).to(GetDashboardUrlImpl);
