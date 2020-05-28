import {Container} from 'typescript-ioc';
import {CreateWebhook} from './create-webhook.api';
import {CreateWebhookImpl} from './create-webhook';

export * from './create-webhook.api';
export * from './create-webhook-options.model';

Container.bind(CreateWebhook).to(CreateWebhookImpl);
