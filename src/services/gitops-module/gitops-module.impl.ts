import * as fs from 'fs-extra';
import simpleGit, {SimpleGit} from 'simple-git';
import * as YAML from 'js-yaml';
import {Container} from 'typescript-ioc';

import {
  ArgoConfig, GitOpsConfig, GitOpsCredential,
  GitOpsCredentials,
  GitOpsLayer,
  GitOpsModuleApi,
  GitOpsModuleInput,
  GitOpsModuleOptions,
  GitOpsModuleResult, LayerConfig, PayloadConfig
} from './gitops-module.api';
import {ArgoApplication} from './argocd-application.model';
import {Kustomization} from './kustomization.model';
import first from '../../util/first';
import {Logger} from '../../util/logger';
import {apiFromUrl, GitApi} from '../../api/git';
import {ChildProcess} from '../../util/child-process';

export class GitopsModuleImpl implements GitOpsModuleApi {
  logger: Logger = Container.get(Logger);
  userConfig = {
    email: 'cloudnativetoolkit@gmail.com',
    name: 'Cloud-Native Toolkit',
  };

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
      return YAML.load(process.env.GITOPS_CONFIG);
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
      return YAML.load(process.env.GIT_CREDENTIALS);
    } else {
      return [{
        repo: '*',
        username,
        url: '*',
        token,
      }];
    }
  }

  async setupPayload(input: GitOpsModuleInput, config: PayloadConfig): Promise<{path: string, url: string, branch: string}> {
    const token: string = this.lookupGitToken(input.gitopsCredentials, config.repo);

    const repoDir = `${input.tmpDir}/.tmprepo-payload-${input.namespace}`;
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

      this.logger.debug(`Adding and committing changes to repo`);
      await git.add('.');
      await git.commit(`Adds payload yaml for ${input.name}`);

      this.logger.debug(`Pulling from the repo to pick up any changes`);
      await git.pull({'--rebase': 'true'});

      this.logger.debug(`Pushing changes`);
      await git.push();

      this.logger.log(`  Application payload added to ${config.repo} in path ${payloadPath}`)

      const branchResult = await git.branch();

      const result = {path: payloadPath, url: `https://${config.repo}`, branch: branchResult.current};

      this.logger.log('Application payload result', {result});

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
    const token: string = this.lookupGitToken(input.gitopsCredentials, config.repo);

    const repoDir = `${input.tmpDir}/.tmprepo-argocd-${input.namespace}`;

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

      this.logger.debug(`Creating overlay path: ${overlayPath}/base`);
      await fs.mkdirp(`${repoDir}/${overlayPath}/base`);

      const nameSuffix = payloadRepo.branch !== 'main' && payloadRepo.branch !== 'master' ? `-${payloadRepo.branch}` : '';
      const applicationName = input.isNamespace
        ? `namespace-${input.name}${nameSuffix}`
        : `${input.namespace}-${input.name}${nameSuffix}`;
      const applicationFile = `base/${applicationName}.yaml`;

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

      const kustomizeFile = `${repoDir}/${overlayPath}/kustomization.yaml`;

      const kustomize = await this.loadKustomize(kustomizeFile);
      kustomize.addResource(applicationFile);

      await fs.writeFile(kustomizeFile, kustomize.asYamlString())

      // commit and push changes
      this.logger.debug(`Adding and committing changes to repo`);
      await git.add('.');
      await git.commit(`Adds argocd config yaml for ${input.name} in ${input.namespace} for ${input.serverName} cluster`);

      this.logger.debug(`Pulling from the repo to pick up any changes`);
      await git.pull({'--rebase': 'true'});

      this.logger.debug(`Pushing changes`);
      await git.push();

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

  async loadKustomize(kustomizeFile: string): Promise<Kustomization> {

    if (!await fs.access(kustomizeFile, fs.constants.R_OK).then(() => true).catch(err => false)) {
      return new Kustomization();
    }

    const kustomizeYaml = await fs.readFile(kustomizeFile);

    const kustomize = YAML.load(kustomizeYaml.toString());

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
