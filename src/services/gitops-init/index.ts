import {Container} from 'typescript-ioc';
import {GitopsInitApi} from './gitops-init.api';
import {GitopsInitService} from './gitops-init.service';

export * from './gitops-init.api'

Container.bind(GitopsInitApi).to(GitopsInitService)
