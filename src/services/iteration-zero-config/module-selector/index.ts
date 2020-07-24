import {Container} from 'typescript-ioc';
import {ModuleSelector} from './module-selector.api';
import {ModuleSelectorImpl} from './module-selector.impl';

export * from './module-selector.api';
export * from './module-selector.model';

Container.bind(ModuleSelector).to(ModuleSelectorImpl);
