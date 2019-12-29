
export class RegisterPipelineOptions {
  templateNamespace?: string;
  pipelineNamespace?: string;
  skipWebhook?: boolean;
  workingDir?: string;
  gitUsername?: string;
  gitPat?: string;
  values?: string;
  generateCrumb?: boolean = false;
  serverUrl?: string;
  pipelineName?: string;
  dryRun?: boolean;
}
