import * as fs from 'fs-extra';
import {SimpleGit} from 'simple-git';
import * as YAML from 'js-yaml';
import {join as pathJoin} from 'path';
import {apiFromUrl, GitApi, MergeResolver, PullRequest, SimpleGitWithApi} from '@cloudnativetoolkit/git-client';
import {Container} from 'typescript-ioc';

import {
  ArgoConfig,
  GitOpsConfig,
  GitOpsCredential,
  GitOpsCredentials,
  GitOpsLayer,
  GitOpsModuleApi,
  GitOpsModuleInput,
  GitOpsModuleOptions,
  GitOpsModuleResult,
  LayerConfig,
  PayloadConfig
} from './gitops-module.api';
import {ArgoApplication} from './argocd-application.model';
import {addKustomizeResource, removeKustomizeResource} from './kustomization.model';
import first from '../../util/first';
import {Logger} from '../../util/logger';
import {ChildProcess} from '../../util/child-process';
import {timer} from '../../util/timer';
import {isString} from '../../util/string-util';
import {isError} from '../../util/error-util';

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

    const argocdGit: GitApi = await this.loadGitApi(input, layerConfig['argocd-config']);
    if (options.rateLimit) {
      await timer(1000);
    }
    const argocdRepoConfig = await this.deleteArgo(argocdGit, input, layerConfig['argocd-config']);

    this.logger.debug('ArgoCD repo config:', {argocdRepoConfig});
    if (argocdRepoConfig.fileChange && options.autoMerge) {
      await argocdGit.updateAndMergePullRequest({pullNumber: argocdRepoConfig.pullNumber, method: 'squash', rateLimit: options.rateLimit, resolver: argocdDeleteResolver(argocdRepoConfig.applicationFile)});
    }

    return {};
  }

  async populate(options: GitOpsModuleOptions): Promise<GitOpsModuleResult> {

    this.logger.log(`Populating gitops repo for component ${options.name} in namespace ${options.namespace}`);

    const input: GitOpsModuleInput = await this.defaultInputs(options);

    const layerConfig: LayerConfig = input.gitopsConfig[input.layer];
    this.logger.debug('Building with layer config: ', layerConfig);

    const payloadGit: GitApi = await this.loadGitApi(input, layerConfig.payload);
    if (options.rateLimit) {
      await timer(1000);
    }
    const payloadRepoConfig = await this.setupPayload(payloadGit, input, layerConfig.payload);

    const argocdGit: GitApi = await this.loadGitApi(input, layerConfig['argocd-config']);
    if (options.rateLimit) {
      await timer(1000);
    }
    const argocdRepoConfig = await this.setupArgo(argocdGit, input, layerConfig['argocd-config'], payloadRepoConfig);

    if (options.autoMerge) {
      await payloadGit.updateAndMergePullRequest({pullNumber: payloadRepoConfig.pullNumber, method: 'squash', rateLimit: options.rateLimit});
      await argocdGit.updateAndMergePullRequest({pullNumber: argocdRepoConfig.pullNumber, method: 'squash', rateLimit: options.rateLimit, resolver: argocdResolver(argocdRepoConfig.applicationFile)});
    }

    return {payloadRepoConfig, argocdRepoConfig};
  }

  async loadGitApi(input: GitOpsModuleInput, config: PayloadConfig): Promise<GitApi> {
    const credentials: GitOpsCredential = this.lookupGitCredential(input.gitopsCredentials, config.repo)

    return apiFromUrl(config.url, {username: credentials.username, password: credentials.token});
  }

  async defaultInputs(options: GitOpsModuleOptions): Promise<GitOpsModuleInput> {
    const gitopsCredentials: GitOpsCredentials = await this.loadGitOpsCredentials(options);
    const gitopsConfig: GitOpsConfig = await this.loadGitOpsConfig(Object.assign({}, options, {gitopsCredentials}));

    const result: GitOpsModuleInput = Object.assign(
      {},
      options,
      {
        gitopsConfig,
        gitopsCredentials,
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

  async loadGitOpsConfig({bootstrapRepoUrl, gitopsConfigFile, token, branch, gitopsCredentials}: {bootstrapRepoUrl?: string, gitopsConfigFile?: string, branch?: string, token?: string, gitopsCredentials: GitOpsCredentials}): Promise<GitOpsConfig> {
    if (!gitopsConfigFile && !bootstrapRepoUrl && !process.env.GITOPS_CONFIG) {
      throw new Error('Missing gitops config file name, bootstrap repo location, or GITOPS_CONFIG env variable');
    }

    if (gitopsConfigFile) {
      return await parseFile(gitopsConfigFile) as GitOpsConfig;
    } else if (process.env.GITOPS_CONFIG) {
      return YAML.load(process.env.GITOPS_CONFIG) as GitOpsConfig;
    } else {
      const credential: GitOpsCredential = this.lookupGitCredential(gitopsCredentials, bootstrapRepoUrl);

      return await parseGitFile(bootstrapRepoUrl, 'config.yaml', {username: credential.username, password: credential.token}, branch) as GitOpsConfig;
    }
  }

  async loadGitOpsCredentials({gitopsCredentialsFile, username = 'username', token}: {gitopsCredentialsFile?: string, username?: string, token?: string}): Promise<GitOpsCredentials> {
    if (!gitopsCredentialsFile && !token && !process.env.GIT_CREDENTIALS) {
      throw new Error('Missing gitops credentials file and token');
    }

    if (gitopsCredentialsFile) {
      return await parseFile(gitopsCredentialsFile) as GitOpsCredentials;
    } else if (process.env.GIT_CREDENTIALS) {
      return YAML.load(process.env.GIT_CREDENTIALS) as GitOpsCredentials;
    } else {
      return [{
        repo: '*',
        username,
        url: '*',
        token,
      }];
    }
  }

  async setupPayload(gitApi: GitApi, input: GitOpsModuleInput, config: PayloadConfig): Promise<{path: string, url: string, branch: string, pullNumber: number}> {

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 5);
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
      const devBranch = `${input.name}-payload`;

      this.logger.debug(`Creating ${devBranch} branch off of origin/${currentBranch}`);
      await git.checkoutBranch(devBranch, `origin/${currentBranch}`)

      this.logger.debug(`Copying from ${input.contentDir} to ${repoDir}/${payloadPath}`);
      const copyResult = await copy(input.contentDir, `${repoDir}/${payloadPath}`);
      this.logger.debug('Result from copy', copyResult);

      await this.addCommitPushBranch(git, message, devBranch);

      this.logger.log(`  Application payload added to ${config.repo} branch ${devBranch} in path ${payloadPath}`)

      const pullRequest: PullRequest = await gitApi.createPullRequest({
        title: message,
        sourceBranch: devBranch,
        targetBranch: currentBranch,
      });

      const result = {path: payloadPath, url: `https://${config.repo}`, branch: currentBranch, pullNumber: pullRequest.pullNumber};

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

  async setupArgo(gitApi: GitApi, input: GitOpsModuleInput, config: ArgoConfig, payloadRepo: {path: string, url: string, branch: string}): Promise<{path: string, url: string, branch: string, pullNumber: number, applicationFile: string}> {

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
      const devBranch = `${input.name}-argocd`;

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
        valueFiles: input.valueFiles,
      });
      await fs.writeFile(`${repoDir}/${overlayPath}/${applicationFile}`, argoApplication.asYamlString());

      const kustomizeFile: string =`${repoDir}/${overlayPath}/kustomization.yaml`;

      await addKustomizeResource(kustomizeFile, applicationFile);

      const message = `Adds argocd config yaml for ${input.name} in ${input.namespace} for ${input.serverName} cluster`;
      // commit and push changes
      await this.addCommitPushBranch(git, message, devBranch);

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
      const devBranch = `${input.name}-argocd-delete`;

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
      await this.addCommitPushBranch(git, message, devBranch);

      this.logger.log(`  ArgoCD config removed from ${config.repo} in path ${overlayPath}/${applicationFile}`)

      const pullRequest: PullRequest = await gitApi.createPullRequest({
        title: message,
        sourceBranch: devBranch,
        targetBranch: currentBranch,
      });

      const result = {path: overlayPath, url: `https://${config.repo}`, branch: devBranch, pullNumber: pullRequest.pullNumber, applicationFile};

      this.logger.debug('ArgoCD config delete result', {result})

      return result;
    } catch (error) {
      this.logger.error('Error deleting ArgoCD config', {error});
      throw error;
    } finally {
      // clean up repo dir
      await fs.remove(repoDir).catch(err => null);
    }
  }

  async addCommitPushBranch(git: SimpleGit, message: string, branch: string): Promise<void> {
    this.logger.debug(`  ** Adding and committing changes to repo`);
    await git.add('.');
    await git.commit(message);

    this.logger.debug(`  ** Pushing changes`);
    const success = await git.push('origin', branch).then(() => true).catch(() => false);
  }

  lookupGitCredential(credentials: GitOpsCredentials, repo: string): GitOpsCredential {
    const filteredCredentials: GitOpsCredential[] = credentials
      .filter(c => c.repo === repo || c.url === repo || c.repo === '*')
      .sort((a: GitOpsCredential, b: GitOpsCredential) => {
        return a.repo === '*' ? 1 : (b.repo === '*' ? -1 : a.repo.localeCompare(b.repo));
      });

    const credential: GitOpsCredential | undefined = first(filteredCredentials);

    if (!credential) {
      throw new Error('Git credentials not found for repo: ' + repo);
    }

    return credential;
  }

  lookupGitToken(credentials: GitOpsCredentials, repo: string): string {
    const credential: GitOpsCredential = this.lookupGitCredential(credentials, repo);

    if (credential.username) {
      return `${credential.username}:${credential.token}`;
    }

    return credential.token;
  }
}

const parsers = {
  'yaml': (content: string | Buffer) => YAML.load(content.toString()),
  'yml': (content: string | Buffer) => YAML.load(content.toString()),
  'json': (content: string | Buffer) => JSON.parse(content.toString()),
};

async function parseFile(filename: string): Promise<object> {

  const extension = filename.replace(/.*[.](.*)$/, '$1');

  const parser = parsers[extension];
  if (!parser) {
    throw new Error('Unknown extension for parsing: ' + extension);
  }

  return parser(await fs.readFile(filename));
}

async function parseGitFile(gitUrl: string, filename: string, credentials: {username: string, password: string}, branch?: string): Promise<object> {

  const extension = filename.replace(/.*[.](.*)$/, '$1');

  const parser = parsers[extension];
  if (!parser) {
    throw new Error('Unknown extension for parsing: ' + extension);
  }

  const gitApi: GitApi = await apiFromUrl(gitUrl, credentials);

  return parser(await gitApi.getFileContents({path: filename}));
}

async function copy(sourceDir: string, destDir: string): Promise<{stdout: string | Buffer, stderr: string | Buffer}> {
  await fs.mkdirp(destDir);

  return new ChildProcess().exec(`cp -R "${sourceDir}"/* "${destDir}"`);
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
