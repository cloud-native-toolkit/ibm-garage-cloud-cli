export class EnvironmentOptions {
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
}

export type EnvironmentOptionKey = keyof EnvironmentOptions;
