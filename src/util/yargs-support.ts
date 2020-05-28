import {Argv, CommandModule, Options} from 'yargs';

import {BaseOptions, EnvironmentOptionKey} from '../model';

export function buildOptionWithEnvDefault(key: EnvironmentOptionKey, options: Options): {[key: string]: Options} {
  const result = {};
  const defaultOption = process.env[key] || options.default;
  result[key] = Object.assign({}, options, defaultOption ? {default: defaultOption} : {});
  return result;
}

export class BuilderOptions {
  optional: boolean;
  describe?: string;
  default?: any;
}

export class DefaultOptionBuilder<T> {
  constructor(private yargs: Argv<T>) {}

  kubeConfig(options: BuilderOptions = {optional: true}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('KUBECONFIG', {
      alias: 'kubeConfig',
      describe: 'KUBECONFIG environment property',
      required: !options.optional,
      type: 'string',
    }));

    return this;
  }

  apiKey(options: BuilderOptions = {optional: false}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('APIKEY', {
      alias: 'apiKey',
      describe: 'ApiKey for IBM Cloud login. Can also be provided as an environment property',
      required: !options.optional,
      type: 'string',
    }));

    return this;
  }

  resourceGroup(options: BuilderOptions = {optional: true}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('RESOURCE_GROUP', {
      alias: ['resourceGroup', 'g'],
      describe: 'The IBM Cloud resource group for the login. Can also be provided as an environment property',
      required: !options.optional,
      type: 'string',
    }));

    return this;
  }

  region(options: BuilderOptions = {optional: true, default: 'us-south'}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('REGION',
      Object.assign(
        {
          alias: ['region', 'r'],
          describe: options.describe || 'The IBM Cloud region for the login. The value defaults to "us-south" if not provided',
          required: !options.optional,
          type: 'string' as any,
        },
        options.default ? {default: options.default} : {}
        )
    ));

    return this;
  }

  registry(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('REGISTRY_URL', {
      alias: 'registry',
      describe: 'The host name for the IBM Cloud image registry. The value defaults to "us.icr.io" if not provided',
      type: 'string',
      default: 'us.icr.io',
    }));

    return this;
  }

  namespace(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('REGISTRY_NAMESPACE', {
      alias: 'registryNamespace',
      describe: 'The namespace to use within the IBM Cloud image registry. The value defaults to "default" if not provided',
      type: 'string',
      default: 'default',
    }));

    return this;
  }

  imageName(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('IMAGE_NAME', {
      alias: ['imageName', 'image'],
      required: true,
      describe: 'The name of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    }));

    return this;
  }

  imageVersion(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('IMAGE_VERSION', {
      alias: ['imageVersion', 'ver'],
      required: true,
      describe: 'The version of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    }));

    return this;
  }

  buildNumber(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('IMAGE_BUILD_NUMBER', {
      alias: 'buildNumber',
      describe: 'The buildNumber that will be added to the image version, if provided. Can be provided as an environment variable',
      type: 'string',
    }));

    return this;
  }

  debug(): DefaultOptionBuilder<T> {
    this.yargs.option('debug', {
      describe: 'Turn on extra logging',
      type: 'boolean',
    });

    return this;
  }

  quiet(): DefaultOptionBuilder<T> {
    this.yargs.option('quiet', {
      describe: 'Suppress all logging',
      type: 'boolean',
    });

    return this;
  }

  clusterName(options: BuilderOptions = {optional: false}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('CLUSTER_NAME', {
      alias: 'cluster',
      required: !options.optional,
      describe: options.describe || 'The cluster into which the image will be deployed. Can also be provided as an environment property',
      type: 'string',
    }));

    return this;
  }

  clusterNamespace(options: BuilderOptions = {optional: false}): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault(
      'CLUSTER_NAMESPACE',
      Object.assign(
        {
          alias: ['namespace', 'n'],
          required: !options.optional,
          describe: options.describe || 'The cluster namespace (env) into which the image will be deployed. Can also be provided as an environment property',
          type: 'string' as any,
        },
        options.default ? {default: options.default} : {}
      )
    ));

    return this;
  }

  chartRoot(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('CHART_ROOT', {
      alias: 'chartRoot',
      default: '.',
      describe: 'The root directory where the chart is located, e.g. {CHART_ROOT}/{CHART_NAME}. Can also be provided as an environment property',
      type: 'string',
    }));

    return this;
  }

  chartName(): DefaultOptionBuilder<T> {
    this.yargs.option(buildOptionWithEnvDefault('CHART_NAME', {
      alias: 'chartName',
      describe: 'The name of the helm chart. Defaults to the imageName if not provided',
      type: 'string',
    }));

    return this;
  }

  baseOptions(): DefaultOptionBuilder<T> {
    return this
      .apiKey()
      .resourceGroup()
      .region()
      .registry()
      .namespace()
      .imageName()
      .imageVersion()
      .buildNumber()
      .debug()
      .quiet();
  }

  build(): Argv<T> {
    return this.yargs;
  }
}

export interface YargsCommandDefinitionArgs {
  command: string;
  aliases?: string[];
  describe?: string
}

export type YargsCommandDefinition = <T>(params: YargsCommandDefinitionArgs) => CommandModule<T> | undefined;
