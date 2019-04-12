#!/usr/bin/env node

import * as path from 'path';
import {Arguments, Argv, scriptName} from 'yargs';
import {execFile} from 'child_process';
import ProcessEnv = NodeJS.ProcessEnv;

class EnvironmentOptions {
  APIKEY: string;
  RESOURCE_GROUP: string;
  CLUSTER_NAME: string;
  REGISTRY_URL: string;
  REGISTRY_NAMESPACE: string;
  REGION: string;
  CHART_ROOT: string;
  IMAGE_BUILD_NUMBER: string;
  IMAGE_NAME: string;
  IMAGE_VERSION: string;
  ENVIRONMENT_NAME: string;
}

class BaseOptions extends EnvironmentOptions {
  imageName: string;
  imageVersion: string;
}

class BuildOptions extends BaseOptions {
  buildNumber: string;
}

class DeployOptions extends BaseOptions {
  environmentName: string;
}

type EnvironmentOptionKeys = keyof EnvironmentOptions;

const ENV_PROPERTIES: Array<EnvironmentOptionKeys> = [
  'APIKEY',
  'RESOURCE_GROUP',
  'CLUSTER_NAME',
  'REGISTRY_URL',
  'REGISTRY_NAMESPACE',
  'REGION',
  'CHART_ROOT',
  'IMAGE_BUILD_NUMBER',
  'IMAGE_NAME',
  'IMAGE_VERSION',
  'ENVIRONMENT_NAME'
];

function initializeArgumentsFromEnvironment(argv: Arguments<EnvironmentOptions>) {
  ENV_PROPERTIES
    .filter(function (name) {
      return !!process.env[name];
    })
    .forEach(function(name) {
      argv[name] = process.env[name];
    });
}

function withBaseOptions<T extends BaseOptions>(yargs: Argv<T>): Argv<T> {
  yargs
    .option('APIKEY', {
      alias: 'apiKey',
      describe: 'ApiKey for IBM Cloud login. Can also be provided as an environment property',
      required: true,
      type: 'string',
    })
    .option('RESOURCE_GROUP', {
      alias: ['resourceGroup', 'rg'],
      describe: 'The IBM Cloud resource group for the login. Can also be provided as an environment property',
      required: true,
      type: 'string',
    })
    .option('REGION', {
      alias: ['region', 'r'],
      describe: 'The IBM Cloud region for the login. The value defaults to "us-south" if not provided',
      type: 'string',
      default: 'us-south',
    })
    .option('REGISTRY_URL', {
      alias: 'registry',
      describe: 'The host name for the IBM Cloud image registry. The value defaults to "us.icr.io" if not provided',
      type: 'string',
      default: 'us.icr.io',
    })
    .option('REGISTRY_NAMESPACE', {
      alias: 'namespace',
      describe: 'The namespace to use within the IBM Cloud image registry. The value defaults to "default" if not provided',
      type: 'string',
      default: 'default',
    })
    .option('IMAGE_NAME', {
      alias: ['imageName', 'image'],
      required: true,
      describe: 'The name of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    })
    .option('IMAGE_VERSION', {
      alias: ['imageVersion', 'ver'],
      required: true,
      describe: 'The version of the image that will be built. Can be provided as an environment variable',
      type: 'string',
    })
    .option('IMAGE_BUILD_NUMBER', {
      alias: 'buildNumber',
      describe: 'The buildNumber that will be added to the image version, if provided. Can be provided as an environment variable',
      type: 'string',
    });

  return yargs;
}

function extractEnvironmentProperties(argv: Arguments<EnvironmentOptions>): ProcessEnv {
  return ENV_PROPERTIES
    .reduce(
      (result: ProcessEnv, name: EnvironmentOptionKeys) => {
        result[name] = argv[name];
        return result;
      },
      {HOME: process.env.HOME, PATH: process.env.PATH} as ProcessEnv,
    );
}

scriptName('ibmcloud-image')
  .usage('$0 <cmd> [args]')
    .middleware(initializeArgumentsFromEnvironment, true)
    .command(
      'build [args]',
      'build the image and push it into the IBM Cloud registry',
      (argv: Argv<BuildOptions>) => withBaseOptions(argv),
      (argv: Arguments<BuildOptions>) => {
        execFile(
          path.join(__dirname, '../bin/build-image.sh'),
          [argv.imageName, argv.imageVersion],
          {env: extractEnvironmentProperties(argv)},
          (error, stdout, stderr) => {
            if (error) {
              console.log('error', error);
              process.exit(1);
            }
            console.log(stdout);
            console.error(stderr);
          });
        },
    )
    .command(
      'deploy [args]',
      'deploy an image from the IBM Cloud registry into a kubernetes cluster',
      (argv: Argv<DeployOptions>) => withBaseOptions(argv)
        .option('CLUSTER_NAME', {
          alias: 'cluster',
          required: true,
          describe: 'The cluster into which the image will be deployed. Can also be provided as an environment property',
          type: 'string',
        })
        .option('CHART_ROOT', {
          alias: 'chartRoot',
          describe: 'The root directory where the chart is located, e.g. {CHART_ROOT}/{CHART_NAME}. Can also be provided as an environment property',
          type: 'string',
        })
        .option('ENVIRONMENT_NAME', {
          alias: ['environmentName', 'env'],
          required: true,
          describe: 'The name of the environment into which the image will be deployed. Can also be provided as an environment property',
          type: 'string',
        }),
      (argv: Arguments<DeployOptions>) => {
        execFile(
          path.join(__dirname, '../bin/deploy-image.sh'),
          [argv.imageName, argv.imageVersion, argv.environmentName],
          {env: extractEnvironmentProperties(argv)},
          (error, stdout, stderr) => {
            if (error) {
              console.log('error', error);
              process.exit(1);
            }
            console.log(stdout);
            console.error(stderr);
          });
      },
    )
    .command(
      'cr',
      'run the container-registry plugin',
      (argv: Argv<any>) => argv,
      (argv: Arguments<any>) => {
        execFile(
          'ibmcloud',
          ['cr'],
          {env: extractEnvironmentProperties(argv)},
          (error, stdout, stderr) => {
            if (error) {
              console.log('error', error);
              process.exit(1);
            }
            console.log(stdout);
            console.error(stderr);
          });
      }
    )
    .demandCommand()
    .help()
    .argv;
