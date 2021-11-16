import {get, post, Response} from 'superagent';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as StreamZip from 'node-stream-zip';

import {
  CreatePullRequestOptions,
  CreateWebhook,
  GitApi,
  GitEvent,
  GitHeader, MergePullRequestOptions, PullRequest,
  UnknownWebhookError,
  WebhookAlreadyExists
} from './git.api';
import {GitBase} from './git.base';
import {TypedGitRepoConfig} from './git.model';
import {isResponseError} from '../../util/superagent-support';
import first from '../../util/first';


enum GogsEvent {
  create = 'create',
  'delete' = 'delete',
  fork = 'fork',
  push = 'push',
  issues = 'issues',
  issue_comment = 'issue_comment',
  pull_request = 'pull_request',
  release = 'release',
}

interface GogsHookData {
  type: 'gogs' | 'slack';
  config: {
    url: string;
    content_type: 'json' | 'form';
    secret?: string;
  }
  events: GogsEvent[];
  active: boolean;
}

enum GogsHeader {
  event = 'X-Gogs-Event'
}


interface Tree {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  url: string;
}

interface TreeResponse {
  sha: string;
  url: string;
  tree: Tree[];
  truncated?: boolean;
}

interface FileResponse {
  content: string;
  encoding: 'base64';
  url: string;
  sha: string;
  size: number;
  node_id: string;
}

interface RepoResponse {
  default_branch: string;
}

interface Branch {
  name: string;
}

interface Token {
  name: string;
  sha1: string;
}

export class Gogs extends GitBase implements GitApi {
  constructor(config: TypedGitRepoConfig) {
    super(config);
  }

  getBaseUrl(): string {
    return `${this.config.protocol}://${this.config.host}/api/v1/repos/${this.config.owner}/${this.config.repo}`;
  }

  async getToken(): Promise<string> {
    const response: Response = await get(`${this.config.protocol}://${this.config.host}/api/v1/users/${this.config.username}/tokens`)
      .auth(this.config.username, this.config.password)
      .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
      .accept('application/json');

    const tokens: Token[] = response.body;

    if (!tokens || tokens.length === 0) {
      return this.createToken();
    }

    return first(tokens.map(token => token.sha1));
  }

  async createToken(): Promise<string> {
    const response: Response = await post(`${this.config.protocol}://${this.config.host}/api/v1/users/${this.config.username}/tokens`)
      .auth(this.config.username, this.config.password)
      .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
      .accept('application/json')
      .send({name: 'gogs'});

    return response.body.sha1;
  }

  async createPullRequest(options: CreatePullRequestOptions): Promise<PullRequest> {

    throw new Error('Method not implemented: createPullRequest')
  }

  async mergePullRequest(options: MergePullRequestOptions): Promise<string> {

    throw new Error('Method not implemented: mergePullRequest')
  }

  async updatePullRequestBranch(pullNumber:number): Promise<string> {

    throw new Error('Method not implemented: updatePullRequestBranch')
  }

  async listFiles(): Promise<Array<{path: string, url?: string, contents?: string}>> {
    try {
      const token: string = await this.getToken();

      const url: string = `${this.config.protocol}://${this.config.host}/api/v1/repos/${this.config.owner}/${this.config.repo}/archive/${this.config.branch}.zip`;
      const response: Response = await get(url)
        .set('Authorization', `token ${token}`)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('application/octet-stream')
        .buffer(true);

      const tmpFile = `${this.config.branch}-tmp.zip`;
      await fs.promises.writeFile(tmpFile, response.body);

      const zip = new StreamZip({
        file: tmpFile,
        storeEntries: true,
      });

      return new Promise<Array<{path: string, url?: string, contents?: string}>>((resolve) => {
        zip.on('ready', () => {
          const files = Object.values(zip.entries())
            .filter(entry => !entry.isDirectory)
            .map(entry => ({path: entry.name.replace(new RegExp('^' + this.config.repo + '/'), '')}));

          // Do not forget to close the file once you're done
          zip.close(() => {
            fs.promises.unlink(tmpFile);
          });

          resolve(files);
        });
      });
    } catch (err) {
      console.log('Error listing files', err);
      throw err;
    }
  }

  async getFileContents(fileDescriptor: {path: string, url?: string}): Promise<string | Buffer> {
    try {
      const token: string = await this.getToken();

      const url: string = `${this.config.protocol}://${this.config.host}/api/v1/repos/${this.config.owner}/${this.config.repo}/raw/${this.config.branch}/${fileDescriptor.path}`;
      const response: Response = await get(url)
        .set('Authorization', `token ${token}`)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('text/plain');

      return response.text;
    } catch (err) {
      console.log('Error getting file contents', err);
      throw err;
    }
  }

  async getDefaultBranch(): Promise<string> {
    try {
      const token: string = await this.getToken();

      const response: Response = await get(this.getBaseUrl())
        .set('Authorization', `token ${token}`)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('application/json');

      const repoResponse: RepoResponse = response.body;

      return _.get(repoResponse, 'default_branch');
    } catch (err) {
      return undefined;
    }
  }

  async createWebhook(options: CreateWebhook): Promise<string> {
    try {
      const token: string = await this.getToken();

      const response: Response = await post(this.getBaseUrl() + '/hooks')
        .set('Authorization', `token ${token}`)
        .set('User-Agent', `${this.config.username} via ibm-garage-cloud cli`)
        .accept('application/json')
        .send(this.buildWebhookData(options));

      return response.body.id;
    } catch (err) {
      if (isResponseError(err)) {
        if (err.response.text.match(/Hook already exists/)) {
          throw new WebhookAlreadyExists('Webhook already exists on repository', err);
        } else {
          throw new UnknownWebhookError('Unknown error creating webhook', err);
        }
      } else {
        throw new UnknownWebhookError(err.message, err);
      }
    }
  }

  buildWebhookData({webhookUrl}: {webhookUrl?: string}): GogsHookData {
    return {
      type: 'gogs',
      config: {
        url: webhookUrl,
        content_type: 'json'
      },
      events: [GogsEvent.push],
      active: true,
    };
  }

  getRefPath(): string {
    return 'body.ref';
  }

  getRef(): string {
    return `refs/heads/${this.config.branch}`;
  }

  getRevisionPath(): string {
    return 'body.after';
  }

  getRepositoryUrlPath(): string {
    return 'body.repository.clone_url';
  }

  getRepositoryNamePath(): string {
    return 'body.repository.full_name';
  }

  getHeader(headerId: GitHeader): string {
    return GogsHeader[headerId];
  }

  getEventName(eventId: GitEvent): string {
    return GogsEvent[eventId];
  }
}
