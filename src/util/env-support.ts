import ProcessEnv = NodeJS.ProcessEnv;
import {BuildOptions, DeployOptions} from "../model";
import {EnvironmentOptionKey} from '../model/environment-options';

export function extractEnvironmentProperties<T>(propertyNames: {[key in keyof T]: EnvironmentOptionKey}, argv: T) {
  return Object.keys(propertyNames)
    .reduce(
      (result: ProcessEnv, name: string) => {
        if (argv[name]) {
          result[propertyNames[name]] = argv[name];
        }
        return result;
      },
      process.env,
    );
}

export const BUILD_OPTION_ENV_PROPERTIES: {[key in keyof BuildOptions]: EnvironmentOptionKey} = {
  apiKey: 'APIKEY',
  resourceGroup: 'RESOURCE_GROUP',
  region: 'REGION',
  registry: 'REGISTRY_URL',
  namespace: 'REGISTRY_NAMESPACE',
  imageName: 'IMAGE_NAME',
  imageVersion: 'IMAGE_VERSION',
  buildNumber: 'IMAGE_BUILD_NUMBER',
};

export const DEPLOY_OPTION_ENV_PROPERTIES: {[key in keyof DeployOptions]: EnvironmentOptionKey} =
  Object.assign(
    {},
    BUILD_OPTION_ENV_PROPERTIES,
    {
      cluster: 'CLUSTER_NAME',
      chartRoot: 'CHART_ROOT',
      environmentName: 'ENVIRONMENT_NAME',
    });
