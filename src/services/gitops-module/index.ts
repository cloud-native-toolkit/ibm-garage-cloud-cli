import {Container} from 'typescript-ioc';
import {GitOpsModuleApi} from './gitops-module.api';
import {GitopsModuleImpl} from './gitops-module.impl';

export * from './gitops-module.api';

Container.bind(GitOpsModuleApi).to(GitopsModuleImpl);

export const buildGitOpsModuleApi = (): GitOpsModuleApi => Container.get(GitOpsModuleApi);
