#!/usr/bin/env node

import {Arguments, Argv, scriptName} from 'yargs';

import {BaseOptions, BuildOptions, DeployOptions, EnvironmentOptionKey} from './model';
import {buildOptionWithEnvDefault} from './util/yargs-support';

import {buildImage, containerRegistry, deployImage} from './index';
import {CommandLineOptions} from "./model/command-line-options";

const ENV_PROPERTIES: Array<EnvironmentOptionKey> = [
  'APIKEY',
  'RESOURCE_GROUP',
  'REGION',
  'REGISTRY_NAMESPACE',
  'REGISTRY_URL',
  'CLUSTER_NAME',
  'CHART_ROOT',
  'IMAGE_BUILD_NUMBER'
];

function withBaseOptions<T extends BaseOptions>(yargs: Argv<T>): Argv<T> {
  yargs
    .option(buildOptionWithEnvDefault('APIKEY', {
      alias: 'apiKey',
      describe: 'ApiKey for IBM Cloud login. Can also be provided as an environment property',
      required: true,
      type: 'string',
    }))
    .option(buildOptionWithEnvDefault('RESOURCE_GROUP', {
      alias: ['resourceGroup', 'rg'],
      describe: 'The IBM Cloud resource group for the login. Can also be provided as an environment property',
      required: true,
      type: 'string',
    }))
    .option(buildOptionWithEnvDefault('REGION', {
      alias: ['region', 'r'],
      describe: 'The IBM Cloud region for the login. The value defaults to "us-south" if not provided',
      type: 'string',
      default: 'us-south',
    }))
    .option(buildOptionWithEnvDefault('REGISTRY_URL', {
      alias: 'registry',
      describe: 'The host name for the IBM Cloud image registry. The value defaults to "us.icr.io" if not provided',
      type: 'string',
      default: 'us.icr.io',
    }))
    .option(buildOptionWithEnvDefault('REGISTRY_NAMESPACE', {
      alias: 'namespace',
      describe: 'The namespace to use within the IBM Cloud image registry. The value defaults to "default" if not provided',
      type: 'string',
      default: 'default',
    }))
    .option(buildOptionWithEnvDefault('IMAGE_NAME', {
      alias: ['imageName', 'image'],
      required: true,
      describe: 'The name of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    }))
    .option(buildOptionWithEnvDefault('IMAGE_VERSION', {
      alias: ['imageVersion', 'ver'],
      required: true,
      describe: 'The version of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    }))
    .option(buildOptionWithEnvDefault('IMAGE_BUILD_NUMBER', {
      alias: 'buildNumber',
      describe: 'The buildNumber that will be added to the image version, if provided. Can be provided as an environment variable',
      type: 'string',
    }))
    .option('debug', {
      describe: 'Turn on extra logging',
      type: 'boolean',
    })
    .option('quiet', {
      describe: 'Suppress all logging',
      type: 'boolean',
    });

  return yargs;
}

scriptName('ibmcloud-image')
  .usage('$0 <cmd> [args]')
  .command(
    'build [args]',
    'build the image and push it into the IBM Cloud registry',
    (argv: Argv<BuildOptions>) => withBaseOptions(argv),
    async (argv: Arguments<BuildOptions & CommandLineOptions>) => {
      if (argv.debug) {
        console.log('arguments', argv);
      }

      try {
        const {stdout, stderr} = await buildImage(argv);

        if (!argv.quiet) {
          console.log(stdout);
          console.log(stderr);
        }
      } catch (error) {
        console.log('error', error);
        process.exit(1);
      }
    },
  )
  .command(
    'deploy [args]',
    'deploy an image from the IBM Cloud registry into a kubernetes cluster',
    (argv: Argv<DeployOptions>) => withBaseOptions(argv)
      .option(buildOptionWithEnvDefault('CLUSTER_NAME', {
        alias: 'cluster',
        required: true,
        describe: 'The cluster into which the image will be deployed. Can also be provided as an environment property',
        type: 'string',
      }))
      .option(buildOptionWithEnvDefault('CHART_ROOT', {
        alias: 'chartRoot',
        required: true,
        describe: 'The root directory where the chart is located, e.g. {CHART_ROOT}/{CHART_NAME}. Can also be provided as an environment property',
        type: 'string',
      }))
      .option(buildOptionWithEnvDefault('ENVIRONMENT_NAME', {
        alias: ['environmentName', 'env'],
        required: true,
        describe: 'The name of the environment into which the image will be deployed. Can also be provided as an environment property',
        type: 'string',
      })),
    async (argv: Arguments<DeployOptions & CommandLineOptions>) => {
      if (argv.debug) {
        console.log('arguments', argv);
      }

      try {
        const {stdout, stderr} = await deployImage(argv);

        if (!argv.quiet) {
          console.log(stdout);
          console.log(stderr);
        }
      } catch (error) {
        console.log('error', error);
        process.exit(1);
      }
    },
  )
  .command(
    'cr',
    'run the container-registry plugin',
    (argv: Argv<any>) => argv.option('debug', {
      alias: 'v',
      describe: 'Verbose logging',
      type: 'boolean'
    }),
    async (argv: Arguments<CommandLineOptions>) => {
      if (argv.debug) {
        console.log('arguments', argv);
      }

      try {
        const {stdout, stderr} = await containerRegistry(argv);

        if (!argv.quiet) {
          console.log(stdout);
          console.log(stderr);
        }
      } catch (error) {
        console.log('error', error);
        process.exit(1);
      }
    }
  )
  .demandCommand()
  .help()
  .argv;
