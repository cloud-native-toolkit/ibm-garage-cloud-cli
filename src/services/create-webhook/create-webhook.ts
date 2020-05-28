import {post, Response} from 'superagent';

import {CreateWebhookOptions} from './create-webhook-options.model';
import {CreateWebhook, isResponseError, UnknownWebhookError, WebhookAlreadyExists} from './create-webhook.api';
import {
  GitConfig,
  GitEvents,
  GitHookData,
  GitHookUrlVerification,
  GitlabHookData,
  GitlabParams,
  GitSlug
} from '../git-secret';


export class CreateWebhookImpl implements CreateWebhook {

  async createWebhook(options: CreateWebhookOptions): Promise<string> {

    const gitConfig: GitConfig = this.extractGitConfig(options.gitUrl);

    try {
      const headers = gitConfig.type === 'github'
        ? {'Authorization': `token ${options.gitToken}`}
        : {'Private-Token': options.gitToken};

      const response: Response = await post(this.buildGitUrl(options))
        .set(headers)
        .set('User-Agent', `${options.gitUsername} via ibm-garage-cloud cli`)
        .accept(gitConfig.type === 'github' ? 'application/vnd.github.v3+json' : 'application/json')
        .send(gitConfig.type === 'gitlab'
          ? this.buildGitlabHookData(Object.assign({}, options, gitConfig))
          : this.buildGitWebhookData(options.jenkinsUrl, options.webhookUrl));

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

  buildGitUrl(options: CreateWebhookOptions) {
    const gitSlug = this.parseGitSlug(options.gitUrl);

    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    return `${apiUrl.url}/${apiUrl.type === 'gitlab' ? 'projects' : 'repos'}/${gitSlug.owner}${apiUrl.type === 'gitlab' ? '%2F' : '/'}${gitSlug.repo}/hooks`;
  }

  extractGitConfig(gitUrl: string): GitConfig {
    const gitSlug: GitSlug = this.parseGitSlug(gitUrl);
    const apiUrl: {url: string, type: string} = this.gitApiUrl(gitSlug);

    return Object.assign(
      {},
      gitSlug,
      apiUrl,
    );
  }

  parseGitSlug(gitUrl: string): GitSlug {
    const results: string[] = new RegExp('(https{0,1}):\/\/([^\/]+)\/([^\/]+)\/([^\/]+)').exec(gitUrl);

    if (!results || results.length < 5) {
      throw new Error(`Invalid url: ${gitUrl}`);
    }

    return {protocol: results[1], host: results[2], owner: results[3], repo: results[4].replace('.git', '')};
  }

  gitApiUrl({protocol, host}: {protocol: string, host: string}): {url: string, type: string} {
    return (host === 'github.com')
      ? {url: 'https://api.github.com', type: 'github'}
      : (/.*git.cloud.ibm.com/.test(host)
        ? {url: `${protocol}://${host}/api/v4`, type: 'gitlab'}
        : {url: `${protocol}://${host}/api/v3`, type: 'ghe'});
  }

  buildGitWebhookData(jenkinsUrl: string, webhookUrl?: string) {
    const url = webhookUrl ? webhookUrl : `${jenkinsUrl}/github-webhook/`;

    const pushGitHook: GitHookData = {
      name: 'web',
      events: [GitEvents.push],
      active: true,
      config: {
        url,
        content_type: 'json',
        insecure_ssl: GitHookUrlVerification.performed,
      }
    };

    return pushGitHook;
  }

  buildGitlabHookData({owner, repo, jenkinsUrl = 'https://jenkins.local/', jenkinsUser, jenkinsPassword, jobName, webhookUrl}: GitlabParams): GitlabHookData {
    const urlParts = /(.*):\/\/(.*)\/*/.exec(jenkinsUrl);
    const protocol = urlParts[1];
    const host = urlParts[2];

    const credentials = (jenkinsUser && jenkinsPassword)
      ? `${jenkinsUser}:${jenkinsPassword}@`
      : '';

    const url = webhookUrl
      ? webhookUrl
      : `${protocol}://${credentials}${host}/project/${jobName}`;

    return {
      id: `${owner}%2F${repo}`,
      url,
      push_events: true,
      enable_ssl_verification: (protocol === 'https'),
    } as any;
  }
}
