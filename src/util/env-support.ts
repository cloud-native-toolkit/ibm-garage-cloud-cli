import ProcessEnv = NodeJS.ProcessEnv;
import {EnvironmentOptionKey} from '../model/environment-options';
import {BuildOptions} from '../commands/build-image';
import {DeployOptions} from '../commands/deploy-image';
import {LaunchToolsOptions} from '../commands/launch-tools';

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
  registryNamespace: 'REGISTRY_NAMESPACE',
  imageName: 'IMAGE_NAME',
  imageVersion: 'IMAGE_VERSION',
  buildNumber: 'IMAGE_BUILD_NUMBER',
};

export const LAUNCH_TOOLS_OPTION_ENV_PROPERTIES: {[key in keyof LaunchToolsOptions]?: EnvironmentOptionKey} = {
  apiKey: 'APIKEY',
  classicUsername: 'CLASSIC_USERNAME',
  classicApiKey: 'CLASSIC_API_KEY'
};

export const DEPLOY_OPTION_ENV_PROPERTIES: {[key in keyof DeployOptions]: EnvironmentOptionKey} =
  Object.assign(
    {},
    BUILD_OPTION_ENV_PROPERTIES,
    {
      cluster: 'CLUSTER_NAME',
      chartRoot: 'CHART_ROOT',
      chartName: 'CHART_NAME',
      namespace: 'CLUSTER_NAMESPACE',
      valuesFile: 'VALUES_FILE'
    }) as {[key in keyof DeployOptions]: EnvironmentOptionKey};
