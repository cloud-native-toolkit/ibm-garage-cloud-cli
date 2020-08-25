import {Container} from 'typescript-ioc';
import {GetGitParameters} from './git-parameters.api';
import {GetGitParametersImpl} from './git-parameters.impl';

export * from './git-parameters.api';
export * from './git-parameters-options.model';
export * from './git-params.model';

Container.bind(GetGitParameters).to(GetGitParametersImpl);
