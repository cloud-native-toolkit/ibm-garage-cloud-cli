import {post, Response} from 'superagent';

import {CreateWebhookOptions} from './create-webhook-options.model';
import {CreateWebhook} from './create-webhook.api';
import {
  GitConfig,
  GitEvents,
  GitHookData,
  GitHookUrlVerification,
  GitlabHookData,
  GitlabParams,
  GitSlug
} from '../git-secret';
import {apiFromUrl, GitApi, isCreateWebhookError, UnknownWebhookError, WebhookAlreadyExists} from '../../api/git'
import {isResponseError} from '../../util/superagent-support';


export class CreateWebhookImpl implements CreateWebhook {

  async createWebhook(options: CreateWebhookOptions): Promise<string> {

    const gitApi: GitApi = await apiFromUrl(options.gitUrl, {username: options.gitUsername, password: options.gitToken});

    return gitApi.createWebhook(options);
  }
}
