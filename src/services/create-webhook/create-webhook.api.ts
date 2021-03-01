import {CreateWebhookOptions} from './create-webhook-options.model';
import {GitConfig} from '../git-secret';

export abstract class CreateWebhook {
  abstract createWebhook(options: CreateWebhookOptions): Promise<string>;
}
