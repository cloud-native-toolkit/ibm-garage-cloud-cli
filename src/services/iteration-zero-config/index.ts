import {Container} from 'typescript-ioc';

import {IterationZeroConfigApi} from './iteration-zero-config.api';
import {IterationZeroConfigService} from './iteration-zero-config.service';

export * from './iteration-zero-config.api'
export * from './iteration-zero-config.model'

Container.bind(IterationZeroConfigApi).to(IterationZeroConfigService);
