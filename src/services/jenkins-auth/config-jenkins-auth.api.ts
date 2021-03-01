import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {Secret} from '../../api/kubectl';

export abstract class JenkinsAuth {
  abstract isAvailable(): boolean;
  abstract configJenkinsAuth<T = any>(options: JenkinsAuthOptions, notifyStatus?: (status: string) => void): Promise<Secret<T>>;
}
