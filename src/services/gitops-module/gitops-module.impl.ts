import * as fs from 'fs-extra';
import simpleGit, {SimpleGit} from 'simple-git';
import * as YAML from 'js-yaml';
import {Container} from 'typescript-ioc';


import {ArgoApplication} from './argocd-application.model';
import {IKustomization, Kustomization} from './kustomization.model';
import {Logger} from '../../util/logger';
import {apiFromUrl, GitApi} from '@cloudnativetoolkit/git-client';
import {ChildProcess} from '../../util/child-process';
import {File} from '../../util/file-util';
import {gitopsUtil} from "../../util/gitops-util";
import {GitOpsModuleApi, GitOpsModuleInput, GitOpsModuleOptions, GitOpsModuleResult} from "./gitops-module.api";
import {ArgoConfig, BaseGitConfig, GitOpsCredentials, GitOpsLayer, LayerConfig, PayloadConfig} from "../../model";

export class GitopsModuleImpl implements GitOpsModuleApi {
  logger: Logger = Container.get(Logger);
  userConfig = {
    email: 'cloudnativetoolkit@gmail.com',
    name: 'Cloud-Native Toolkit',
  };

  async delete(options: GitOpsModuleOptions): Promise<GitOpsModuleResult> {
    return {}
  }

  async populate(options: GitOpsModuleOptions): Promise<GitOpsModuleResult> {

    this.logger.log(`Populating gitops repo for component ${options.name} in namespace ${options.namespace}`);

    const input: GitOpsModuleInput = await this.defaultInputs(options);

    const layerConfig: LayerConfig = input.gitopsConfig[input.layer];
    this.logger.debug('Building with layer config: ', layerConfig);

    const payloadRepoConfig = await this.setupPayload(input, layerConfig.payload);

    const argocdRepoConfig = await this.setupArgo(input, layerConfig['argocd-config'], payloadRepoConfig);

    return {payloadRepoConfig, argocdRepoConfig};
  }

  async defaultInputs(options: GitOpsModuleOptions): Promise<GitOpsModuleInput> {
    const gitConfig: BaseGitConfig = await gitopsUtil.defaultGitOpsInputs(options);

    const result: GitOpsModuleInput = Object.assign(
      {},
      options,
      {
        gitopsConfig: gitConfig.gitopsConfig,
        gitopsCredentials: gitConfig.gitopsCredentials,
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

  async setupPayload(input: GitOpsModuleInput, config: PayloadConfig): Promise<{path: string, url: string, branch: string}> {
    const token: string = gitopsUtil.lookupGitToken(input.gitopsCredentials, config.repo);

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 5);
    const repoDir = `${input.tmpDir}/.tmprepo-payload-${input.namespace}-${suffix}`;
    const payloadPath = input.isNamespace
      ? `${config.path}/namespace/${input.name}/namespace`
      : `${config.path}/namespace/${input.namespace}/${input.applicationPath}`;

    // create repo dir
    await fs.mkdirp(repoDir);

    try {

      const git: SimpleGit = simpleGit({baseDir: input.tmpDir});

      this.logger.debug(`Cloning ${config.repo} into ${repoDir}`);

      // clone into repo dir
      await git.clone(`https://${token}@${config.repo}`, repoDir);

      this.logger.debug(`Changing working directory to ${repoDir}`);

      await git.cwd({path: repoDir, root: true});

      if (input.branch) {
        this.logger.debug(`Switching to branch ${input.branch}`);
        await git.checkoutBranch(input.branch, `origin/${input.branch}`);
      }

      this.logger.debug('Configuring git username and password');
      await git.addConfig('user.email', this.userConfig.email, true, 'local');
      await git.addConfig('user.name', this.userConfig.name, true, 'local');

      this.logger.debug(`Copying from ${input.contentDir} to ${repoDir}/${payloadPath}`);
      const copyResult = await copy(input.contentDir, `${repoDir}/${payloadPath}`);
      this.logger.debug('Result from copy', copyResult);

      await this.addCommitPush(git, `Adds payload yaml for ${input.name}`, 'ours', async () => false);

      this.logger.log(`  Application payload added to ${config.repo} in path ${payloadPath}`)

      const branchResult = await git.branch();

      const result = {path: payloadPath, url: `https://${config.repo}`, branch: branchResult.current};

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

  async setupArgo(input: GitOpsModuleInput, config: ArgoConfig, payloadRepo: {path: string, url: string, branch: string}): Promise<{path: string, url: string, branch: string}> {
    const token: string = gitopsUtil.lookupGitToken(input.gitopsCredentials, config.repo);

    const suffix = Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 5);
    const repoDir = `${input.tmpDir}/.tmprepo-argocd-${input.namespace}-${suffix}`;

    // create repo dir
    await fs.mkdirp(repoDir);

    try {
      const git: SimpleGit = simpleGit({baseDir: input.tmpDir});

      this.logger.debug(`Cloning ${config.repo} into ${repoDir}`);

      // clone into repo dir
      await git.clone(`https://${token}@${config.repo}`, repoDir);

      await git.cwd({path: repoDir, root: true});

      this.logger.debug('Configuring git username and password');
      await git.addConfig('user.email', this.userConfig.email, true, 'local');
      await git.addConfig('user.name', this.userConfig.name, true, 'local');

      // create overlay config path
      const overlayPath = `${config.path}/cluster/${input.serverName}`;

      this.logger.debug(`Creating overlay path: ${overlayPath}/${input.type}`);
      await fs.mkdirp(`${repoDir}/${overlayPath}/${input.type}`);

      const nameSuffix = payloadRepo.branch !== 'main' && payloadRepo.branch !== 'master' ? `-${payloadRepo.branch}` : '';
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

      const kustomizeFile: File = new File(`${repoDir}/${overlayPath}/kustomization.yaml`);

      const addKustomizeResource = async (): Promise<boolean> => {
        const kustomize: Kustomization = await this.loadKustomize(kustomizeFile);

        if (kustomize.containsResource(applicationFile)) {
          return false;
        }

        kustomize.addResource(applicationFile);

        return kustomizeFile.write(kustomize.asYamlString()).then(() => true);
      };

      await addKustomizeResource();

      // commit and push changes
      await this.addCommitPush(
        git,
        `Adds argocd config yaml for ${input.name} in ${input.namespace} for ${input.serverName} cluster`,
        'theirs',
        addKustomizeResource
      );

      this.logger.log(`  ArgoCD config added to ${config.repo} in path ${overlayPath}/${applicationFile}`)

      const branchResult = await git.branch();

      await git.cwd({path: input.tmpDir, root: true});

      const result = {path: overlayPath, url: `https://${config.repo}`, branch: branchResult.current};

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

  async addCommitPush(git: SimpleGit, message: string, strategy: 'theirs' | 'ours', reapplyChanges: () => Promise<boolean>, retryCount: number = 20): Promise<void> {
    let success = false;
    let count = 0;
    do {
      count += 1;

      this.logger.debug(`  ** Adding and committing changes to repo`);
      await git.add('.');
      await git.commit(message);

      this.logger.debug(`  ** Pulling from the repo to pick up any changes`);
      await git.pull({'--rebase': 'true', '-s': 'recursive', '-X': strategy});

      if (await reapplyChanges()) {
        continue;
      }

      this.logger.debug(`  ** Pushing changes`);
      success = await git.push().then(() => true).catch(() => false);
    } while (!success && count < retryCount);

    if (count >= retryCount) {
      throw new Error('Exceeded retry count to push changes');
    }
  }

  async loadKustomize(kustomizeFile: File): Promise<Kustomization> {

    if (!await kustomizeFile.exists()) {
      return new Kustomization();
    }

    const kustomize: IKustomization = await kustomizeFile.readYaml();

    return new Kustomization(kustomize);
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
