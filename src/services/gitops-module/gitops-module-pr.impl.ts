import * as fs from 'fs-extra';
import {mkdirp, readFile, writeFile} from 'fs-extra';
import {SimpleGit} from 'simple-git';
import * as YAML from 'js-yaml';
import {basename, join as pathJoin} from 'path';
import {apiFromUrl, GitApi, MergeResolver, PullRequest, SimpleGitWithApi} from '@cloudnativetoolkit/git-client';
import {Container} from 'typescript-ioc';
import {http, https} from 'follow-redirects';
import _ from 'lodash'

import {ArgoApplication} from './argocd-application.model';
import {addKustomizeResource, removeKustomizeResource} from './kustomization.model';
import {Logger} from '../../util/logger';
import {ChildProcess} from '../../util/child-process';
import {timer} from '../../util/timer';
import {isString, parseFile, parsers, parseString} from '../../util/string-util';
import {isError} from '../../util/error-util';
import {gitopsUtil} from "../../util/gitops-util";
import {GitOpsModuleApi, GitOpsModuleInput, GitOpsModuleOptions, GitOpsModuleResult} from "./gitops-module.api";
import {
  ArgoConfig,
  BaseGitConfig,
  GitOpsConfig,
  GitOpsCredential,
  GitOpsCredentials,
  GitOpsLayer,
  isGitopsConfig, isGitopsConfigEntry,
  LayerConfig, PayloadConfig
} from "../../model";

const argocdResolver = (applicationPath: string): MergeResolver => {
  return async (git: SimpleGitWithApi, conflicts: string[]): Promise<{resolvedConflicts: string[], conflictErrors: Error[]}> => {
    const kustomizeYamls: string[] = conflicts.filter(f => /.*kustomization.yaml/.test(f));

    const promises: Array<Promise<string | Error>> = kustomizeYamls
      .map(async (kustomizeYaml: string) => {
        await git.raw(['checkout', '--ours', kustomizeYaml]);

        await addKustomizeResource(pathJoin(git.repoDir, kustomizeYaml), applicationPath);

        return kustomizeYaml;
      })
      .map(p => p.catch(error => error));

    const result: Array<string | Error> = await Promise.all(promises);

    const resolvedConflicts: string[] = result.filter(isString);
    const conflictErrors: Error[] = result.filter(isError);

    return {resolvedConflicts, conflictErrors};
  }
}

const argocdDeleteResolver = (applicationPath: string): MergeResolver => {
  return async (git: SimpleGitWithApi, conflicts: string[]): Promise<{resolvedConflicts: string[], conflictErrors: Error[]}> => {
    const kustomizeYamls: string[] = conflicts.filter(f => /.*kustomization.yaml/.test(f));

    const promises: Array<Promise<string | Error>> = kustomizeYamls
      .map(async (kustomizeYaml: string) => {
        await git.raw(['checkout', '--ours', kustomizeYaml]);

        await removeKustomizeResource(pathJoin(git.repoDir, kustomizeYaml), applicationPath);

        return kustomizeYaml;
      })
      .map(p => p.catch(error => error));

    const result: Array<string | Error> = await Promise.all(promises);

    const resolvedConflicts: string[] = result.filter(isString);
    const conflictErrors: Error[] = result.filter(isError);

    return {resolvedConflicts, conflictErrors};
  }
}

export class GitopsModulePRImpl implements GitOpsModuleApi {
  logger: Logger = Container.get(Logger);
  userConfig = {
    email: 'cloudnativetoolkit@gmail.com',
    name: 'Cloud-Native Toolkit',
  };

  async delete(options: GitOpsModuleOptions): Promise<GitOpsModuleResult> {

    this.logger.log(`Deleting gitops repo entry for component ${options.name} in namespace ${options.namespace}`);

    const input: GitOpsModuleInput = await this.defaultInputs(options);

    const layerConfig: LayerConfig = input.gitopsConfig[input.layer];
    this.logger.debug('Deleting with layer config: ', layerConfig);

    const argocdGit: GitApi = await gitopsUtil.loadGitApi(input, layerConfig['argocd-config']);
    if (options.rateLimit) {
      await timer(1000);
    }
    const argocdRepoConfig = await this.deleteArgo(argocdGit, input, layerConfig['argocd-config']);

    this.logger.debug('ArgoCD repo config:', {argocdRepoConfig});
    if (argocdRepoConfig.fileChange && options.autoMerge) {
      await argocdGit.updateAndMergePullRequest({
        pullNumber: argocdRepoConfig.pullNumber,
        method: 'squash',
        rateLimit: options.rateLimit,
        waitForBlocked: options.waitForBlocked,
        resolver: argocdDeleteResolver(argocdRepoConfig.applicationFile)
      });
    }

    return {};
  }

  async populate(options: GitOpsModuleOptions): Promise<GitOpsModuleResult> {

    if (options.isNamespace) {
      this.logger.log(`Populating gitops repo for namespace ${options.name}`);
    } else {
      this.logger.log(`Populating gitops repo for component ${options.name} in namespace ${options.namespace}`);
    }

    const input: GitOpsModuleInput = await this.defaultInputs(options);

    const layerConfig: LayerConfig = input.gitopsConfig[input.layer];
    this.logger.debug('Building with layer config: ', layerConfig);

    const payloadGit: GitApi = await gitopsUtil.loadGitApi(input, layerConfig.payload);
    if (options.rateLimit) {
      await timer(1000);
    }
    const payloadRepoConfig = await this.setupPayload(payloadGit, input, layerConfig.payload);

    const argocdGit: GitApi = await this.loadGitApi(input, layerConfig['argocd-config']);
    if (options.rateLimit) {
      await timer(1000);
    }
    const argocdRepoConfig = await this.setupArgo(argocdGit, input, layerConfig['argocd-config'], payloadRepoConfig, parseIgnoreDiff(options.ignoreDiff));

    if (options.autoMerge) {
      if (payloadRepoConfig.pullNumber) {
        await payloadGit.updateAndMergePullRequest({
          pullNumber: payloadRepoConfig.pullNumber,
          method: 'squash',
          rateLimit: options.rateLimit,
          waitForBlocked: options.waitForBlocked
        })
      }
      if (argocdRepoConfig.pullNumber) {
        await argocdGit.updateAndMergePullRequest({
          pullNumber: argocdRepoConfig.pullNumber,
          method: 'squash',
          rateLimit: options.rateLimit,
          waitForBlocked: options.waitForBlocked,
          resolver: argocdResolver(argocdRepoConfig.applicationFile)
        });
      }
    }

    return {payloadRepoConfig, argocdRepoConfig};
  }

  async loadGitApi(input: GitOpsModuleInput, config: PayloadConfig): Promise<GitApi> {
    const credentials: GitOpsCredential = gitopsUtil.lookupGitCredential(input.gitopsCredentials, config.repo)

    return apiFromUrl(config.url, {username: credentials.username, password: credentials.token, caCert: input.caCert});
  }

  async defaultInputs(options: GitOpsModuleOptions): Promise<GitOpsModuleInput> {
    const config: BaseGitConfig = await gitopsUtil.defaultGitOpsInputs(options)

    const result: GitOpsModuleInput = Object.assign(
      {},
      options,
      {
        gitopsConfig: config.gitopsConfig,
        gitopsCredentials: config.gitopsCredentials,
        applicationPath: options.applicationPath || options.name,
        branch: options.branch || '',
        layer: options.layer || GitOpsLayer.applications,
        serverName: options.serverName || 'default',
        tmpDir: options.tmpDir || '/tmp/gitops-module',
        valueFiles: options.valueFiles ? options.valueFiles.split(',') : [],
        contentDir: options.contentDir || process.cwd(),
        isNamespace: options.isNamespace || false,
        type: options.type || 'base',
      });

    switch (result.layer) {
      case GitOpsLayer.infrastructure:
      case GitOpsLayer.services:
      case GitOpsLayer.applications:
        break;
      default:
        throw new Error('Invalid value for layer: ' + result.layer);
    }

    return result;
  }

  async setupPayload(gitApi: GitApi, input: GitOpsModuleInput, config: PayloadConfig): Promise<{path: string, url: string, branch: string, pullNumber?: number, isHelm?: boolean, valueFiles?: string[]}> {

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').slice(0, 5);
    const repoDir = `${input.tmpDir}/.tmprepo-payload-${input.namespace}-${suffix}`;
    const payloadPath = input.isNamespace
      ? `${config.path}/namespace/${input.name}/namespace`
      : `${config.path}/namespace/${input.namespace}/${input.applicationPath}`;
    const message = `Adds payload yaml for ${input.name}`;

    // create repo dir
    await fs.mkdirp(repoDir);

    try {

      const git: SimpleGit = await gitApi.clone(repoDir, {baseDir: input.tmpDir, config: {'user.email': this.userConfig.email, 'user.name': this.userConfig.name}})

      const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
        if (inputBranch) {
          return inputBranch;
        }

        return git.branch().then(result => result.current);
      }

      const currentBranch = await getCurrentBranch(input.branch)
      this.logger.debug(`Using ${currentBranch} as base branch`)
      const devBranch = `${input.name}-payload-${suffix}`;

      this.logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`);
      await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

      let valueFiles: string[] = input.valueFiles
      if (input.helmRepoUrl && input.helmChart && input.helmChartVersion) {
        this.logger.debug(`Setting up chart ${input.helmChart} from ${input.helmRepoUrl} to ${repoDir}/${payloadPath}`);
        valueFiles = await setupHelmChartDir(input.helmRepoUrl, input.helmChart, input.helmChartVersion, input.valueFiles, `${repoDir}/${payloadPath}`);
      } else {
        this.logger.debug(`Copying from ${input.contentDir} to ${repoDir}/${payloadPath}`);
        const copyResult = await copy(input.contentDir, `${repoDir}/${payloadPath}`);
        this.logger.debug('Result from copy', copyResult);
      }

      const pushResult = await gitopsUtil.addCommitPushBranch(git, message, devBranch);

      if (!pushResult) {
        this.logger.log(`  No changes to application payload for ${config.repo} branch ${devBranch} in path ${payloadPath}`)
        return {
          path: payloadPath,
          url: `https://${config.repo}`,
          branch: currentBranch,
          isHelm: !!input.helmRepoUrl || this.isHelmChart(input.contentDir),
          valueFiles
        }
      }

      this.logger.log(`  Application payload added to ${config.repo} branch ${devBranch} in path ${payloadPath}`)

      const pullRequest: PullRequest = await (gitApi
        .createPullRequest({
          title: message,
          sourceBranch: devBranch,
          targetBranch: currentBranch,
        })
        .catch(err => {
          console.log('Error creating pull request: ', err)
          throw err
        }) as Promise<PullRequest>);

      const result = {
        path: payloadPath,
        url: `https://${config.repo}`,
        branch: currentBranch,
        pullNumber: pullRequest.pullNumber,
        isHelm: !!input.helmRepoUrl || this.isHelmChart(input.contentDir),
        valueFiles
      };

      this.logger.debug('Application payload result', {result});

      return result;
    } catch (error) {
      this.logger.error('Error updating application config', {error});
      throw error;
    } finally {
      // clean up repo dir
      await fs.remove(repoDir);
    }
  }

  isHelmChart(contentDir: string): boolean {
    const chartFile = pathJoin(contentDir, 'Chart.yaml')

    return fs.existsSync(chartFile)
  }

  async setupArgo(gitApi: GitApi, input: GitOpsModuleInput, config: ArgoConfig, payloadRepo: {path: string, url: string, branch: string, isHelm?: boolean, valueFiles?: string[]}, ignoreDifferences: object[] | undefined): Promise<{path: string, url: string, branch: string, pullNumber?: number, applicationFile: string}> {

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 5);
    const repoDir = `${input.tmpDir}/.tmprepo-argocd-${input.namespace}-${suffix}`;

    // create repo dir
    await fs.mkdirp(repoDir);

    try {
      const git: SimpleGit = await gitApi.clone(repoDir, {baseDir: input.tmpDir, userConfig: this.userConfig})

      const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
        if (inputBranch) {
          return inputBranch;
        }

        return git.branch().then(result => result.current);
      }

      const currentBranch = await getCurrentBranch(input.branch)
      const devBranch = `${input.name}-argocd-${suffix}`;

      this.logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`);
      await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

      // create overlay config path
      const overlayPath = `${config.path}/cluster/${input.serverName}`;

      this.logger.debug(`Creating overlay path: ${overlayPath}/${input.type}`);
      await fs.mkdirp(`${repoDir}/${overlayPath}/${input.type}`);

      const nameSuffix = currentBranch !== 'main' && currentBranch !== 'master' ? `-${currentBranch}` : '';
      const applicationName = buildApplicationName(input.name, input.namespace, nameSuffix, input.isNamespace);
      const applicationFile = `${input.type}/${applicationName}.yaml`;

      const argoApplication: ArgoApplication = new ArgoApplication({
        name: applicationName,
        namespace: input.namespace,
        project: config.project,
        sourcePath: payloadRepo.path,
        sourceRepoUrl: payloadRepo.url,
        sourceBranch: payloadRepo.branch,
        valueFiles: payloadRepo.valueFiles,
        releaseName: input.name,
        isHelm: payloadRepo.isHelm,
        ignoreDifferences,
        cascadingDelete: input.cascadingDelete,
      });
      await fs.writeFile(`${repoDir}/${overlayPath}/${applicationFile}`, argoApplication.asYamlString());

      const kustomizeFile: string =`${repoDir}/${overlayPath}/kustomization.yaml`;

      await addKustomizeResource(kustomizeFile, applicationFile);

      const message = `Adds argocd config yaml for ${input.name} in ${input.namespace} for ${input.serverName} cluster`;
      // commit and push changes
      const pushResult = await gitopsUtil.addCommitPushBranch(git, message, devBranch);

      if (!pushResult) {
        this.logger.log(`  No changes to ArgoCD config for ${config.repo} in path ${overlayPath}/${applicationFile}`)
        return {path: overlayPath, url: `https://${config.repo}`, branch: devBranch, applicationFile}
      }

      this.logger.log(`  ArgoCD config added to ${config.repo} in path ${overlayPath}/${applicationFile}`)

      const pullRequest: PullRequest = await gitApi.createPullRequest({
        title: message,
        sourceBranch: devBranch,
        targetBranch: currentBranch,
      });

      const result = {path: overlayPath, url: `https://${config.repo}`, branch: devBranch, pullNumber: pullRequest.pullNumber, applicationFile};

      this.logger.debug('ArgoCD config result', {result})

      return result;
    } catch (error) {
      this.logger.error('Error updating ArgoCD config', {error});
      throw error;
    } finally {
      // clean up repo dir
      await fs.remove(repoDir).catch(err => null);
    }
  }

  async deleteArgo(gitApi: GitApi, input: GitOpsModuleInput, config: ArgoConfig): Promise<{path: string, url: string, branch: string, pullNumber?: number, applicationFile: string, fileChange?: boolean}> {

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 5);
    const repoDir = `${input.tmpDir}/.tmprepo-argocd-${input.namespace}-${suffix}`;

    // create repo dir
    await fs.mkdirp(repoDir);

    try {
      const git: SimpleGit = await gitApi.clone(repoDir, {baseDir: input.tmpDir, userConfig: this.userConfig})

      const getCurrentBranch = async (inputBranch?: string): Promise<string> => {
        if (inputBranch) {
          return inputBranch;
        }

        return git.branch().then(result => result.current);
      }

      const currentBranch = await getCurrentBranch(input.branch)
      const devBranch = `${input.name}-argocd-delete-${suffix}`;

      this.logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`);
      await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

      // create overlay config path
      const overlayPath = `${config.path}/cluster/${input.serverName}`;

      const nameSuffix = currentBranch !== 'main' && currentBranch !== 'master' ? `-${currentBranch}` : '';
      const applicationName = buildApplicationName(input.name, input.namespace, nameSuffix, input.isNamespace);
      const applicationFile = `${input.type}/${applicationName}.yaml`;

      const kustomizeFile: string =`${repoDir}/${overlayPath}/kustomization.yaml`;

      const fileChange: boolean = await removeKustomizeResource(kustomizeFile, applicationFile);

      if (!fileChange) {
        return {fileChange, path: overlayPath, url: `https://${config.repo}`, branch: devBranch, applicationFile};
      }

      const message = `Removes argocd config yaml for ${input.name} in ${input.namespace} for ${input.serverName} cluster`;
      // commit and push changes
      await gitopsUtil.addCommitPushBranch(git, message, devBranch);

      this.logger.log(`  ArgoCD config removed from ${config.repo} in path ${overlayPath}/${applicationFile}`)

      const pullRequest: PullRequest = await gitApi.createPullRequest({
        title: message,
        sourceBranch: devBranch,
        targetBranch: currentBranch,
      });

      const result = {fileChange, path: overlayPath, url: `https://${config.repo}`, branch: devBranch, pullNumber: pullRequest.pullNumber, applicationFile};

      this.logger.debug('ArgoCD config delete result', {result})

      return result;
    } catch (error) {
      this.logger.error('Error deleting ArgoCD config', {error});
      throw error;
    } finally {
      // clean up repo dir
      this.logger.debug('Cleaning up repo dir')
      await fs.remove(repoDir).catch(err => {
        this.logger.debug('Error cleaning up repo dir')
        return null
      });
    }
  }
}

async function copy(sourceDir: string, destDir: string): Promise<{stdout: string | Buffer, stderr: string | Buffer}> {
  await fs.mkdirp(destDir);

  if (/^https?:\/\/*/.test(sourceDir)) {
    const protocol = sourceDir.replace(/^(https?):\/\/.*/, '$1')

    const get = protocol === 'https' ? https.get : http.get;
    const file = fs.createWriteStream(pathJoin(destDir, 'content.yaml'));
    return new Promise<{stdout: string, stderr: string}>((resolve) => {
      get(sourceDir, response => {
        response.pipe(file);

        resolve({stdout: '', stderr: ''})
      });
    });
  } else {
    return new ChildProcess().exec(`cp -R "${sourceDir}"/* "${destDir}"`);
  }
}

const KUBERNETES_NAME_LIMIT = 63;
function buildApplicationName(name: string, namespace: string, nameSuffix: string, isNamespace: boolean): string {
  const applicationName = isNamespace
    ? `namespace-${name}`
    : `${namespace}-${name}`;

  const lengthLimit = KUBERNETES_NAME_LIMIT - nameSuffix.length;

  const truncatedName = applicationName.length > lengthLimit
    ? applicationName.substring(0, KUBERNETES_NAME_LIMIT - nameSuffix.length)
    : applicationName;

  const cleansedName = truncatedName.endsWith('-')
    ? truncatedName.substring(0, truncatedName.length - 1)
    : truncatedName;

  return cleansedName + nameSuffix;
}

const parseIgnoreDiff = (ignoreDiff?: string): object[] | undefined => {
  if (!ignoreDiff) {
    return
  }

  try {
    return JSON.parse(ignoreDiff)
  } catch (err) {
    return
  }
}

const setupHelmChartDir = async (repository: string, name: string, version: string, valueFiles: string[], destination: string): Promise<string[]> => {
  // create Chart.yaml in destination
  const chartConfig = {
    apiVersion: 'v2',
    name,
    description: `A helm chart to wrap ${name} from ${repository}`,
    type: 'application',
    version: '0.1.0',
    appVersion: '0.1.0',
    dependencies: [
      {
        name,
        version,
        repository
      }
    ]
  }

  await mkdirp(destination)

  await writeFile(pathJoin(destination, 'Chart.yaml'), YAML.dump(chartConfig))

  const updatedValueFiles: string[] = []
  for (let i = 0; i < (valueFiles || []).length; i++) {
    const file = valueFiles[i]

    const contents: Buffer = await readFile(file)
    const valuesContent = {}
    valuesContent[name] = YAML.load(contents.toString())

    const filename = basename(file)

    await writeFile(pathJoin(destination, filename), YAML.dump(valuesContent))

    updatedValueFiles.push(filename)
  }

  // TODO download the helm tar.gz file into the charts/ folder

  return updatedValueFiles
}
