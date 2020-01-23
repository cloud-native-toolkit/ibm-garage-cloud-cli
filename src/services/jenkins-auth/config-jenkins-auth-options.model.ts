import {EnvironmentOptionKey} from '../../model';
import {IbmCloudCluster} from '../../model/ibm-cloud-cluster';

export class JenkinsAuthOptions extends IbmCloudCluster {
  host?: string;
  url?: string;
  username: string;
  password: string;
  jenkinsApiToken?: string;
  namespace?: string;
  debug?: boolean;
  inCluster?: boolean;
}

export const JENKINS_AUTH_ENV_PROPERTIES: {[key in keyof JenkinsAuthOptions]: EnvironmentOptionKey} = {
  // kubeConfig: 'KUBECONFIG',
  // apiKey: 'APIKEY',
  // resourceGroup: 'RESOURCE_GROUP',
  // region: 'REGION',
  // cluster: 'CLUSTER_NAME',
  host: 'JENKINS_HOST',
  url: 'JENKINS_URL',
  username: 'JENKINS_USERNAME',
  password: 'JENKINS_PASSWORD'
};
