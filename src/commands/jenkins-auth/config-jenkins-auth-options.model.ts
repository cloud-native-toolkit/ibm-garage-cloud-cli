import {EnvironmentOptionKey} from '../../model';

export class JenkinsAuthOptions {
  host: string;
  username: string;
  password: string;
  apiKey: string;
  region: string;
  resourceGroup: string;
  cluster: string;
  debug?: boolean;
}

export const JENKINS_AUTH_ENV_PROPERTIES: {[key in keyof JenkinsAuthOptions]: EnvironmentOptionKey} = {
  apiKey: 'APIKEY',
  resourceGroup: 'RESOURCE_GROUP',
  region: 'REGION',
  cluster: 'CLUSTER_NAME',
  host: 'JENKINS_HOST',
  username: 'JENKINS_USERNAME',
  password: 'JENKINS_PASSWORD'
};
