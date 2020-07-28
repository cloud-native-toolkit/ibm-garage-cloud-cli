import {Container} from 'typescript-ioc';
import {GetConsoleUrlApi} from './console.api';
import {GetConsoleUrlService} from './console.service';

export * from './console.api';

Container.bind(GetConsoleUrlApi).to(GetConsoleUrlService);
