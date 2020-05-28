import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';

export abstract class JenkinsAuth {
  abstract isAvailable(): boolean;
  async abstract configJenkinsAuth(options: JenkinsAuthOptions, notifyStatus?: (status: string) => void);
}
