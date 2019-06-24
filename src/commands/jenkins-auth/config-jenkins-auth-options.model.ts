import {EnvironmentOptionKey} from '../../model';

export class JenkinsAuthOptions {
  url: string;
  username: string;
  password: string;
  apiKey: string;
  region: string;
  resourceGroup: string;
  cluster: string;
}

export const JENKINS_AUTH_ENV_PROPERTIES: {[key in keyof JenkinsAuthOptions]: EnvironmentOptionKey} = {
  apiKey: 'APIKEY',
  resourceGroup: 'RESOURCE_GROUP',
  region: 'REGION',
  cluster: 'CLUSTER_NAME',
  url: 'JENKINS_HOST',
  username: 'JENKINS_USERNAME',
  password: 'JENKINS_PASSWORD'
};
