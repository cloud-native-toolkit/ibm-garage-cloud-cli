import {Arguments, Argv} from 'yargs';
import {promises} from 'fs';

import {GitopsInitApi, GitopsInitOptions} from '../services/gitops-init';
import {Container} from 'typescript-ioc';
import {BootstrapConfig, GitOpsConfig} from '../services/gitops-module';

export const command = 'gitops-init [repo]';
export const desc = 'Populates the gitops repo with the configuration for a namespace';
export const builder = (yargs: Argv<any>) => {
  return yargs
    .positional('repo', {
      description: 'The short name of the repository (i.e. the part after the org/group name)',
      type: 'string',
      demandOption: true,
    })
    .options({
      'host': {
        alias: ['h'],
        description: 'The host name of the git server. The value can be provided as a `GIT_HOST` environment variable.',
        type: 'string',
        demandOption: true,
      },
      'org': {
        type: 'string',
        describe: 'The org/group where the git repository exists/will be provisioned. The value can be provided as a `GIT_HOST` environment variable. If the value is left blank then the username org will be used.',
        demandOption: false,
      },
      'project': {
        description: 'The project that will be used for the git repo. The value can be provided as a `GIT_PROJECT` environment variable. (Primarily used for Azure DevOps repos)',
        type: 'string',
        demandOption: false
      },
      'username': {
        description: 'The username of the user with access to the repository. The value can also be provided via the `GIT_USERNAME` environment variable.',
        type: 'string',
        demandOption: false
      },
      'token': {
        description: 'The token/password used to authenticate the user to the git server. The value can also be provided via the GIT_TOKEN environment variable.',
        type: 'string',
        demandOption: false
      },
      'branch': {
        description: 'The name of the branch that will be used. If the repo already exists then it is assumed this branch already exists as well.',
        type: 'string',
        demandOption: false,
        default: 'main',
      },
      'serverName': {
        description: 'The name of the cluster that will be configured via gitops. This is used to separate the config by cluster.',
        type: 'string',
        demandOption: false,
        default: 'default',
      },
      'sealedSecretsCertFile': {
        description: 'The file containing the certificate/public key used to encrypt the sealed secrets. The contents of the file can be provided via the KUBESEAL_CERT environment variable.',
        type: 'string',
        demandOption: false,
      },
      'public': {
        description: 'Flag indicating that the repo should be public or private',
        type: 'boolean',
        demandOption: false,
        default: false,
      },
      'strict': {
        description: 'Flag indicating that an error should be thrown if the repo already exists',
        type: 'boolean',
        demandOption: false,
        default: false,
      },
      'delete': {
        description: 'Flag indicating that the repo should be deleted',
        type: 'boolean',
        demandOption: false,
        default: false,
      },
      'caCertFile': {
        type: 'string',
        description: 'Name of the file containing the ca certificate for SSL connections. The contents of the file can also be provided using the CA_CERT environment variable.',
        demandOption: false
      },
      'output': {
        alias: ['o'],
        type: 'string',
        description: 'The format of output from the command. (text, json)',
        demandOption: false,
        default: 'text'
      },
      'waitForBlocked': {
        describe: 'The amount of time to wait for blocked pull requests. The format is "1h30m10s" or any combination.',
        type: 'string',
        default: '1h',
        require: false
      },
      'tmpDir': {
        type: 'string',
        description: 'The temporary directory where git repo changes will be staged.',
        demandOption: false,
        default: '.tmp/gitops-init'
      },
      'argocdNamespace': {
        type: 'string',
        description: 'The namespace where ArgoCD is running in the cluster.',
        demandOption: false,
        default: 'openshift-gitops',
      },
    })
    .middleware(loadFromEnv('host', 'GIT_HOST'), true)
    .middleware(loadFromEnv('org', 'GIT_ORG'), true)
    .middleware(loadFromEnv('project', 'GIT_PROJECT'), true)
    .middleware(loadFromEnv('username', 'GIT_USERNAME'), true)
    .middleware(loadFromEnv('token', 'GIT_TOKEN'), true)
    .middleware(handleCert('caCert', 'caCertFile', 'CA_CERT'))
    .middleware(handleCert('sealedSecretsCert', 'sealedSecretsCertFile', 'KUBESEAL_CERT'))
    .middleware(argv => {
      if (!argv.org) {
        return {
          org: argv.username
        }
      }

      return {}
    })
};
exports.handler = async (argv: Arguments<GitopsInitOptions & {debug: boolean, output: string, delete: boolean}>) => {
  const service: GitopsInitApi = Container.get(GitopsInitApi)

  if (argv.delete) {
    if (argv.output !== 'json') {
      console.log(`Deleting repository: ${argv.host}/${argv.org}/${argv.repo}`)
    }

    try {
      const result: { url: string, deleted: boolean } = await service.delete(argv)

      if (argv.output === 'json') {
        console.log(JSON.stringify(result, null, 2))
      } else if (result.deleted) {
        console.log(`  Git repository deleted: ${result.url}`)
      } else {
        console.log(`  Git repository was not deleted: ${result.url}`)
      }

      process.exit(0)
    } catch (err) {
      console.log(err.message)
      process.exit(1)
    }
  }

  if (argv.output !== 'json') {
    console.log(`Creating repository: ${argv.host}/${argv.org}/${argv.repo}`)
  }

  try {
    const result: {url: string, created: boolean, initialized: boolean, gitopsConfig: GitOpsConfig, kubesealCert?: string} = await service.create(argv)

    if (argv.output === 'json') {
      console.log(JSON.stringify(result, null, 2))
    } else if (result.created) {
      console.log(`  Git repository created: ${result.url}`)
    } else {
      console.log(`  Git repository already exists: ${result.url}`)
    }
  } catch (err) {
    console.log(err.message)
    process.exit(1)
  }
};

export const loadFromEnv = (name: string, envName: string) => {
  return yargs => {
    const result = {}

    if (!yargs[name]) {
      result[name] = process.env[envName]
    }

    return result
  }
}

const handleCert = (name: string, fileArg: string, certEnv: string) => {
  return async yargs => {
    const result = {}

    const certFile = yargs[fileArg]
    if (certFile) {
      result[name] = {
        certFile,
        cert: await promises.readFile(certFile)
      }
    } else if (process.env[certEnv]) {
      result[name] = {
        cert: process.env[certEnv]
      }
    }

    return result
  }
}
