import {Container} from 'typescript-ioc';
import {GitSecret} from './git-secret.api';
import {GitSecretImpl} from './git-secret.impl';

export * from './git-secret.api';

Container.bind(GitSecret).to(GitSecretImpl);
