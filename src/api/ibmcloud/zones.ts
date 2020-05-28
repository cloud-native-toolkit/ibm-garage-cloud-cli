import {Container} from 'typescript-ioc';
import {Zones} from './zones.api';
import {ZonesImpl} from './zones.impl';

export * from './zones.api';

Container.bind(Zones).to(ZonesImpl);
