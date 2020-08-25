import {Container} from 'typescript-ioc';
import {CreateGitSecret} from './create-git-secret.api';
import {CreateGitSecretImpl} from './create-git-secret.impl';

export * from './create-git-secret.api';

Container.bind(CreateGitSecret).to(CreateGitSecretImpl);
