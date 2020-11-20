import {get, Response} from 'superagent';
import * as _ from 'lodash';

import {GitApi} from './git.api';
import {AuthGitRepoConfig, GitHost, GitRepoConfig, TypedGitRepoConfig} from './git.model';
import {Github, GithubEnterprise} from './github';
import {Gitlab} from './gitlab';
import {Gogs} from './gogs';
import {Bitbucket} from './bitbucket';

export * from './git.api';
export * from './git.model';

const GIT_URL_PATTERNS = {
  'http': '(https{0,1})://(.*)/(.*)/(.*).git',
  'git@': '(git@)(.*):(.*)/(.*).git'
};

const API_FACTORIES = [
  {key: GitHost.github, value: Github},
  {key: GitHost.ghe, value: GithubEnterprise},
  {key: GitHost.gitlab, value: Gitlab},
  {key: GitHost.gogs, value: Gogs},
  {key: GitHost.bitbucket, value: Bitbucket},
].reduce((result: {[key: string]: any}, current: {key: GitHost, value: any}) => {
    result[current.key] = current.value;

    return result;
}, {})


export async function apiFromUrl(repoUrl: string, credentials: {username: string, password: string}, branch?: string): Promise<GitApi> {
  const config: TypedGitRepoConfig = await gitRepoConfigFromUrl(repoUrl, credentials, branch);

  return new API_FACTORIES[config.type](config);
}

export async function gitRepoConfigFromUrl(repoUrl: string, credentials: {username: string, password: string}, branch = 'master'): Promise<TypedGitRepoConfig> {
  const config: AuthGitRepoConfig = Object.assign({}, parseGitUrl(repoUrl), _.pick(credentials, ['username', 'password']), {branch});

  const type: GitHost = await getGitRepoType(config);

  return Object.assign({}, config, {type});
}

async function getGitRepoType(config: AuthGitRepoConfig): Promise<GitHost> {
  if (config.host === 'github.com') {
    return GitHost.github;
  }

  if (config.host === 'bitbucket.org') {
    return GitHost.bitbucket;
  }

  if (await hasHeader(`${config.protocol}://${config.host}/api/v3`, 'X-GitHub-Enterprise-Version', config)) {
    return GitHost.ghe;
  }

  if (await hasBody(`${config.protocol}://${config.host}/api/v4/projects`, config)) {
    return GitHost.gitlab;
  }

  if (await hasBody(`${config.protocol}://${config.host}/api/v1/users/${config.username}`, config)) {
    return GitHost.gogs;
  }

  throw new Error('Unable to identify Git host type: ' + config.url);
}

async function hasHeader(url: string, header: string, {username, password}: {username: string, password: string}): Promise<boolean> {
  try {
    const response: Response = await get(url).auth(username, password);

    const value = response.header[header] || response.header[header.toLowerCase()];

    return !!value;
  } catch (err) {
    return false;
  }
}

async function hasBody(url: string, {username, password}: {username: string, password: string}): Promise<boolean> {
  try {
    const response: Response = await get(url).auth(username, password);

    const result = response.body;

    return !!result;
  } catch (err) {
    return false;
  }
}

export function parseGitUrl(url: string): GitRepoConfig {
  const pattern = GIT_URL_PATTERNS[url.substring(0, 4)];

  if (!pattern) {
    throw new Error(`invalid git url: ${url}`);
  }

  const results = new RegExp(pattern, 'gi')
    .exec(url.endsWith('.git') ? url : `${url}.git`);

  if (!results || results.length < 4) {
    throw new Error(`invalid git url: ${url}`);
  }

  const protocol = results[1] === 'git@' ? 'https' : results[1];
  const host = /.*@.*/.test(results[2]) ? results[2].split('@')[1] : results[2];
  const owner = results[3];
  const repo = results[4];

  return {
    url: `${protocol}://${host}/${owner}/${repo}.git`,
    protocol,
    host,
    owner,
    repo
  };
}
