import {apiFromPartialConfig, GitApi, GitRepo, PullRequest} from '@cloudnativetoolkit/git-client';
import {Credentials} from '@cloudnativetoolkit/git-client/dist/lib/util';
import {SimpleGitWithApi} from '@cloudnativetoolkit/git-client/src/lib/git.api';
import {promises} from 'fs';
import {join} from 'path';
import {dump, load} from 'js-yaml';
import {SimpleGit} from 'simple-git';
import {Container} from 'typescript-ioc';
import {mkdirp, pathExists, remove} from 'fs-extra';

import {ExistingGitRepo, GitopsInitApi, GitopsInitOptions} from './gitops-init.api';
import {Logger} from '../../util/logger';
import {GitOpsConfig} from '../gitops-module';

export class GitopsInitService implements GitopsInitApi {
  async create(options: GitopsInitOptions): Promise<{url: string, repo: string, created: boolean, initialized: boolean, gitopsConfig: GitOpsConfig, kubesealCert?: string}> {

    const logger: Logger = Container.get(Logger)

    logger.debug(`Creating repository: ${options.host}/${options.org}/${options.repo}`)
    const {gitClient, created} = await createOrFindRepo(options)

    logger.debug(`Repository created (${created}): ${gitClient.getConfig().url}`)
    const {initialized, gitopsConfig, kubesealCert} = await initializeGitopsRepo(gitClient, options)

    return {
      url: gitClient.getConfig().url,
      repo: gitClient.getConfig().url.replace(/^https?:\/\//, '').replace(/[.]git$/, ''),
      created,
      initialized,
      gitopsConfig,
      kubesealCert,
    }
  }

  async delete(options: GitopsInitOptions): Promise<{url: string, repo: string, deleted: boolean}> {

    const logger: Logger = Container.get(Logger)

    logger.debug(`Deleting repository: ${options.host}/${options.org}/${options.repo}`)

    const gitClient: GitApi = await apiFromPartialConfig(
      options,
      await buildGitCredentials(options))

    const repoModuleId: string = await gitClient.getFileContents({path: '.owner_module'})
      .then(buf => buf.toString())
      .catch(() => '')

    let deleted = false
    if ((options.moduleId || '') === repoModuleId) {
      await gitClient.deleteRepo()

      deleted = true
    } else {
      logger.debug('ModuleId does not match .owner_module. Not deleting.')
    }

    return {
      url: gitClient.getConfig().url,
      repo: gitClient.getConfig().url.replace(/^https?:\/\//, '').replace(/[.]git$/, ''),
      deleted,
    }
  }
}

const createOrFindRepo = async (options: GitopsInitOptions): Promise<{gitClient: GitApi, created: boolean}> => {

  const gitClient: GitApi = await apiFromPartialConfig(
    options,
    await buildGitCredentials(options))

  // check if repo exists
  const repoInfo: GitRepo | undefined = await gitClient.getRepoInfo().catch(() => undefined)

  // create repo
  if (repoInfo) {
    if (options.strict) {
      throw new ExistingGitRepo(gitClient.getConfig().url)
    }

    return {gitClient, created: false}
  }

  const newClient = await gitClient.createRepo({name: options.repo, autoInit: true, privateRepo: !options.public})

  return {gitClient: newClient, created: true}
}

const buildGitCredentials = async (options: GitopsInitOptions): Promise<Credentials> => {
  let caCert: {cert: string, certFile: string};
  if (options.caCert) {
    let certFile = options.caCert.certFile
    if (!certFile) {
      certFile = join(options.tmpDir, 'git-server.crt')

      await promises.writeFile(certFile, options.caCert.cert)
    }

    caCert = {
      cert: options.caCert.cert,
      certFile,
    }
  }

  return {
    username: options.username,
    password: options.token,
    caCert,
  }
}

const initializeGitopsRepo = async (gitClient: GitApi, input: {tmpDir: string, branch: string, serverName: string, argocdNamespace: string, sealedSecretsCert?: {cert: string, certFile?: string}}): Promise<{initialized: boolean, gitopsConfig: GitOpsConfig, kubesealCert?: string}> => {
  const logger: Logger = Container.get(Logger)

  const repoDir: string = join(input.tmpDir, makeId(12))

  const git: SimpleGitWithApi = await gitClient.clone(repoDir, {config: {'user.email': 'cloudnativetoolkit@gmail.com', 'user.name': 'Cloud-Native Toolkit'}})

  try {
    if (await isInitializedRepo(repoDir)) {
      logger.debug(`Gitops repository already initialized: ${gitClient.getConfig().url}`)
      const config: { gitopsConfig: GitOpsConfig, kubesealCert?: string } = await getInitializedConfig(repoDir)

      logger.debug(`Found existing gitops repository config: ${gitClient.getConfig().url}`, config)
      return Object.assign({initialized: false}, config)
    }

    const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
      if (inputBranch) {
        return inputBranch
      }

      return git.branch().then(result => result.current)
    }

    const currentBranch = await getCurrentBranch(input.branch)
    const devBranch = 'initialize-gitops'

    logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`)
    await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

    const config = Object.assign({}, input, {repoUrl: gitClient.getConfig().url})
    const initializeResult: { gitopsConfig: GitOpsConfig, kubesealCert?: string } = await populateGitopsRepo(repoDir, config)

    const message = 'Initializes gitops repo structure'
    const pushResult = await addCommitPushBranch(git, message, devBranch)
    if (!pushResult) {
      throw new Error('Error pushing changes to gitops repo')
    }

    const pullRequest: PullRequest = await git.gitApi.createPullRequest({
      title: message,
      sourceBranch: devBranch,
      targetBranch: currentBranch,
    })

    await git.gitApi.updateAndMergePullRequest({
      pullNumber: pullRequest.pullNumber,
      method: 'squash',
      waitForBlocked: '1h',
    })

    return Object.assign({initialized: true}, initializeResult)
  } finally {
    await remove(repoDir)
  }
}

const isInitializedRepo = async (repoDir: string): Promise<boolean> => {
  return pathExists(join(repoDir, 'config.yaml'));
}

const getInitializedConfig = async (repoDir: string): Promise<{gitopsConfig: GitOpsConfig, kubesealCert?: string}> => {
  const gitopsConfig: GitOpsConfig = await promises.readFile(join(repoDir, 'config.yaml')).then(buf => load(buf.toString()) as GitOpsConfig)

  let kubesealCert: string = ''
  if (await pathExists(join(repoDir, 'kubeseal_cert.pem'))) {
    kubesealCert = await promises.readFile(join(repoDir, 'kubeseal_cert.pem')).then(buf => buf.toString())
  }

  return {gitopsConfig, kubesealCert}
}

const populateGitopsRepo = async (repoDir: string, input: {moduleId?: string, serverName: string, repoUrl: string, branch: string, argocdNamespace: string, sealedSecretsCert?: {cert: string, certFile?: string}}): Promise<{gitopsConfig: GitOpsConfig, kubesealCert?: string}> => {

  // write bootstrap chart and values
  const bootstrapPath = join(repoDir, 'argocd', '0-bootstrap', 'cluster', input.serverName)

  await mkdirp(bootstrapPath)

  await promises.writeFile(join(bootstrapPath, 'Chart.yaml'), dump(buildBootstrapChartYaml(input)))

  const bootstrapValues: BootstrapConfig = buildBoostrapValuesYaml(input)
  await promises.writeFile(join(bootstrapPath, 'values.yaml'), dump(bootstrapValues))

  // write argocd directories
  const argocdTargetPaths: string[] = extractArgocdTargetPaths(bootstrapValues)
  for (let i = 0; i < argocdTargetPaths.length; i++) {
    const targetPath = join(repoDir, argocdTargetPaths[i], 'cluster', input.serverName)

    await mkdirp(targetPath)

    await promises.writeFile(
      join(targetPath, 'kustomization.yaml'),
      dump({
        apiVersion: 'kustomize.config.k8s.io/v1beta1',
        kind: 'Kustomization'
      })
    )
  }

  // initialize empty payload directories
  const payloadTargetPaths = ['1-infrastructure', '2-services', '3-applications']
  for (let i = 0; i < payloadTargetPaths.length; i++) {
    const targetPath = join(repoDir, 'payload', payloadTargetPaths[i])

    await mkdirp(targetPath)

    await promises.writeFile(join(targetPath, '.gitkeep'), '')
  }

  if (input.moduleId) {
    await promises.writeFile(join(repoDir, '.owner_module'), input.moduleId)
  }

  await promises.writeFile(join(repoDir, 'README.md'), readmeFile)

  const gitopsConfig: GitOpsConfig = buildConfigYaml(bootstrapValues)
  await promises.writeFile(join(repoDir, 'config.yaml'), dump(gitopsConfig))

  let kubesealCert: string | undefined
  if (input.sealedSecretsCert) {
    if (input.sealedSecretsCert.cert) {
      await promises.writeFile(join(repoDir, 'kubeseal_cert.pem'), input.sealedSecretsCert.cert)

      kubesealCert = input.sealedSecretsCert.cert
    } else if (input.sealedSecretsCert.certFile) {
      await promises.copyFile(input.sealedSecretsCert.certFile, join(repoDir, 'kubeseal_cert.pem'))

      kubesealCert = await promises.readFile(input.sealedSecretsCert.certFile).then(buf => buf.toString())
    }
  }

  return {gitopsConfig, kubesealCert}
}

const makeId = (length: number): string => {
  const result           = ['a', '-'];
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * characters.length)))
  }

  return result.join('')
}

const configChartVersion = '0.24.0'
const helmRepoUrl = 'https://charts.cloudnativetoolkit.dev/'

const argocdConfigDependency = (alias: string): {name: string, version: string, repository: string, alias: string} => {
  return {
    name: 'argocd-config',
    version: configChartVersion,
    repository: helmRepoUrl,
    alias
  }
}

const buildBootstrapChartYaml = ({serverName}: {serverName: string}) => ({
  apiVersion: 'v2',
  name: serverName,
  description: 'Helm chart to boostrap the ArgoCD app of apps pattern',
  type: 'application',
  version: '0.1.0',
  appVersion: '1.16.0',
  dependencies: [
    argocdConfigDependency('infrastructure'),
    argocdConfigDependency('services'),
    argocdConfigDependency('applications'),
  ]
})

const buildBoostrapValuesYaml = ({repoUrl, branch, argocdNamespace, serverName}: {repoUrl: string, branch: string, argocdNamespace: string, serverName: string}): BootstrapConfig => ({
  global: {
    repoUrl,
    targetRevision: branch,
    targetNamespace: argocdNamespace,
    destinations: {
      targetNamespace: '*'
    },
    pathSuffix: `cluster/${serverName}`,
    prefix: ''
  },
  infrastructure: {
    project: '1-infrastructure',
    clusterResourceWhitelist: [{
      group: '*',
      kind: 'Namespace'
    }, {
      group: 'storage.k8s.io',
      kind: 'StorageClass'
    }, {
      group: 'security.openshift.io',
      kind: 'SecurityContextConstraints',
    }, {
      group: 'security.openshift.io',
      kind: 'SecurityContextConstraint',
    }, {
      group: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
    }, {
      group: 'rbac.authorization.k8s.io',
      kind: 'ClusterRoleBinding',
    }, {
      group: 'apiextensions.k8s.io',
      kind: 'CustomResourceDefinition',
    }, {
      group: 'console.openshift.io',
      kind: 'ConsoleNotification',
    }, {
      group: 'admissionregistration.k8s.io',
      kind: 'MutatingWebhookConfiguration',
    }, {
      group: 'admissionregistration.k8s.io',
      kind: 'ValidatingWebhookConfiguration',
    }],
    applicationTargets: [{
      applications: [{
        name: '1-infrastructure',
        path: 'argocd/1-infrastructure',
      }]
    }]
  },
  services: {
    project: '2-services',
    clusterResourceWhitelist: [{
      group: 'apiextensions.k8s.io',
      kind: 'CustomResourceDefinition',
    }],
    applicationTargets: [{
      applications: [{
        name: '2-services',
        path: 'argocd/2-services',
      }]
    }]
  },
  applications: {
    project: '3-applications',
    applicationTargets: [{
      applications: [{
        name: '3-applications',
        path: 'argocd/3-applications',
      }]
    }]
  }
})

interface ClusterResourceWhitelist {
  group: string;
  kind: string;
}

interface Application {
  name: string;
  path: string;
}

interface ApplicationTarget {
  applications: Application[];
}

interface LayerConfig {
  project: string;
  clusterResourceWhitelist?: ClusterResourceWhitelist[];
  applicationTargets: ApplicationTarget[];
}

interface BootstrapGlobalConfig {
  repoUrl: string;
  targetRevision: string;
  targetNamespace: string;
  destinations: {targetNamespace: string};
  pathSuffix: string;
  prefix: string;
}

interface BootstrapConfig {
  global: BootstrapGlobalConfig;
  infrastructure: LayerConfig;
  services: LayerConfig;
  applications: LayerConfig;
}

const extractArgocdTargetPaths = (valuesConfig: BootstrapConfig): string[] => {

  return [valuesConfig.infrastructure, valuesConfig.services, valuesConfig.applications]
    .map(layer => layer.applicationTargets)
    .reduce(flatten, [])
    .map(targets => targets.applications)
    .reduce(flatten, [])
    .map(app => app.path)
}

const flatten = <T>(result: Array<T>, current: Array<T>): Array<T> => {
  result.push(...current)

  return result
}

const buildConfigYaml = (valuesConfig: BootstrapConfig): GitOpsConfig => {
  const repo = valuesConfig.global.repoUrl.replace(/^https?:\/\//, '').replace(/[.]git$/, '')
  const url = valuesConfig.global.repoUrl

  return {
    bootstrap: {
      'argocd-config': buildArgocdConfig({url, repo, name: '0-bootstrap'}),
    },
    infrastructure: buildLayerConfig({url, repo, name: '1-infrastructure'}),
    services: buildLayerConfig({url, repo, name: '2-services'}),
    applications: buildLayerConfig({url, repo, name: '3-applications'}),
  }
}

const buildLayerConfig = ({url, repo, name, argocdPath = 'argocd', payloadPath = 'payload'}: {url: string, repo: string, name: string, argocdPath?: string, payloadPath?: string}): any => {
  return {
    'argocd-config': buildArgocdConfig({url, repo, name, argocdPath}),
    payload: {
      repo,
      url,
      path: `${payloadPath}/${name}`,
    },

  }
}

const buildArgocdConfig = ({url, repo, name, argocdPath = 'argocd'}: {url: string, repo: string, name: string, argocdPath?: string}): any => {
  return {
    project: name,
    repo,
    url,
    path: `${argocdPath}/${name}`,
  }
}

const readmeFile = `# GitOps repository

Repository that contains the yaml resources defining the desired state of the configuration for a cluster. The resources are organized to support deployments to multiple clusters.

## App of Apps

There are two major types of resources in the repository:

1. ArgoCD configuration
2. Application "payloads"

### ArgoCD configuration

In ArgoCD, collections of kubernetes resources that are deployed together are called "applications". Applications in ArgoCD are configured using a custom resource definition (CRD) in the cluster which means ArgoCD applications can deploy other ArgoCD applications (called the ["App of Apps pattern"](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern)). With the "App of Apps pattern", the ArgoCD environment can be bootstrapped with an initial application. That initial bootstrap application can then be updated in the GitOps repository to configure other applications.

### Application "payloads"

The ArgoCD configuration points to other paths within the GitOps repository that contain the actual "payload" yaml to provision the applications (the deployments, config maps, etc that make up the applications)/

## Layered components

In addition to separating the ArgoCD configuration from the application "payloads", the configuration has also been divided into three different "layers" of the cluster configuration:

1. Infrastructure
2. Shared services
3. Applications

### Infrastructure

Foundational elements within the cluster, like namespaces, service accounts, role-based access control, etc. These resources are often managed by the infrastructure team and are required by the other resources.

### Shared Services

Shared services are application components that are used across multiple applications or across the cluster. Often these are operator-based services and managed independently from the applications.

### Applications

The application layer contains the applications deployed to the cluster, using the infrastructure and shared service components.

## Structure

Putting it all together, there are seven different locations for the GitOps content:

1. Bootstrap
2. Infrastructure ArgoCD configuration
3. Shared services ArgoCD configuration
4. Application ArgoCD configuration
5. Infrastructure payload
6. Shared services payload
7. Application payload

![Structure overview](https://operate.cloudnativetoolkit.dev/images/gitops-structure-overview.png)

This repository implements a simple configuration where all seven collections of resources are stored in a single repository. For more complicated deployments, the resources can be separated into different repositories. For example, if the infrastructure, services, and application configuration is managed by different teams then each layer can be managed in a different gitops repository.

In order to understand where all the pieces that make up the GitOps deployment can be located, the bootstrap repository contains a yaml file that defined the repository and path for each of the seven locations. This file can be used both by humans to understand the layout and by the cli. 

[config.yaml](./config.yaml)
`

const addCommitPushBranch = async (git: SimpleGit, message: string, branch: string): Promise<boolean> => {
  const logger: Logger = Container.get(Logger)

  const status: any = await git.status()
  if (status.not_added.length === 0 && status.deleted.length === 0 && status.conflicted.length === 0 && status.staged.length === 0 && status.modified.length === 0) {
    return false
  }

  logger.debug(`  ** Adding and committing changes to repo`);
  await git.add('.');
  await git.commit(message);

  logger.debug(`  ** Pushing changes`);
  await git.push('origin', branch).then(() => true).catch(() => false);

  return true
}
