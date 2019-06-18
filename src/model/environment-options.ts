export class EnvironmentOptions {
  KUBECONFIG: string;
  APIKEY: string;
  RESOURCE_GROUP: string;
  CLUSTER_NAME: string;
  REGISTRY_URL: string;
  REGISTRY_NAMESPACE: string;
  REGION: string;
  CHART_ROOT: string;
  CHART_NAME: string;
  IMAGE_BUILD_NUMBER: string;
  IMAGE_NAME: string;
  IMAGE_VERSION: string;
  CLUSTER_NAMESPACE: string;
  VALUES_FILE: string;
  CLASSIC_USERNAME: string;
  CLASSIC_API_KEY: string;
  JENKINS_HOST: string;
  JENKINS_URL: string;
  JENKINS_USERNAME: string;
  JENKINS_PASSWORD: string;
  USER_NAME: string;
  API_TOKEN: string;
  GIT_URL: string;
}

export type EnvironmentOptionKey = keyof EnvironmentOptions;
