import {EnvironmentOptionKey} from '../../model';

export class JenkinsAuthOptions {
  host?: string;
  url?: string;
  username: string;
  password: string;
  kubeConfig?: string;
  apiKey?: string;
  jenkinsApiToken?: string;
  region?: string;
  resourceGroup?: string;
  cluster?: string;
  debug?: boolean;
}

export const JENKINS_AUTH_ENV_PROPERTIES: {[key in keyof JenkinsAuthOptions]: EnvironmentOptionKey} = {
  kubeConfig: 'KUBECONFIG',
  apiKey: 'APIKEY',
  resourceGroup: 'RESOURCE_GROUP',
  region: 'REGION',
  cluster: 'CLUSTER_NAME',
  host: 'JENKINS_HOST',
  url: 'JENKINS_URL',
  username: 'JENKINS_USERNAME',
  password: 'JENKINS_PASSWORD'
};
