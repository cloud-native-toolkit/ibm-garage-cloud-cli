
export class RegisterPipelineOptions {
  jenkinsNamespace?: string;
  pipelineNamespace?: string;
  skipWebhook?: boolean;
  workingDir?: string;
  gitUsername?: string;
  gitPat?: string;
  values?: string;
  generateCrumb?: boolean = false;
}
