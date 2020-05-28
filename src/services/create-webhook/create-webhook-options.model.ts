export class CreateWebhookOptions {
  jenkinsUrl?: string;
  jenkinsUser?: string;
  jenkinsPassword?: string;
  jobName?: string;
  gitUrl: string;
  gitUsername: string;
  gitToken: string;
  webhookUrl?: string;
}
