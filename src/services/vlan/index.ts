import {Container} from 'typescript-ioc';
import {GetVlan} from './get-vlan.api';
import {GetVlanImpl} from './get-vlan';

export * from './get-vlan.api';
export * from './get-vlan-options.model';

Container.bind(GetVlan).to(GetVlanImpl);