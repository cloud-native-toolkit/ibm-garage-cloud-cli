import {Container} from 'typescript-ioc';
import {JenkinsAuth} from './config-jenkins-auth.api';
import {JenkinsAuthImpl} from './config-jenkins-auth';

export * from './config-jenkins-auth.api';
export * from './config-jenkins-auth-options.model';

Container.bind(JenkinsAuth).to(JenkinsAuthImpl);
