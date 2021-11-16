import {CreateWebhookOptions} from './create-webhook-options.model';
import {CreateWebhook} from './create-webhook.api';
import {apiFromUrl, GitApi} from '../../api/git'

export class CreateWebhookImpl implements CreateWebhook {

  async createWebhook(options: CreateWebhookOptions): Promise<string> {

    const gitApi: GitApi = await apiFromUrl(options.gitUrl, {username: options.gitUsername, password: options.gitToken});

    return gitApi.createWebhook(options);
  }
}
