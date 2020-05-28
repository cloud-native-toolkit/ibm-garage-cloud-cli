import {Container} from 'typescript-ioc';
import {VlansImpl} from './vlans.impl';
import {Vlans} from './vlans.api';

export * from './vlans.api';

Container.bind(Vlans).to(VlansImpl);
