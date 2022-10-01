import {GitOpsConfig} from '../gitops-module';

export interface GitopsInitOptions {
  host: string;
  org: string;
  project?: string;
  repo: string;
  branch: string;
  public: boolean;
  serverName: string;
  argocdNamespace: string;
  sealedSecretsCert?: {cert: string, certFile?: string};
  strict: boolean;
  username: string;
  token: string;
  caCert?: {cert: string, certFile?: string};
  tmpDir: string;
  moduleId?: string;
}

export class ExistingGitRepo extends Error {
  constructor(public readonly gitUrl: string) {
    super(`Git repository already exists: ${gitUrl}`)
  }
}

export abstract class GitopsInitApi {
  abstract create(options: GitopsInitOptions): Promise<{url: string, created: boolean, initialized: boolean, gitopsConfig: GitOpsConfig, kubesealCert?: string}>;
  abstract delete(options: GitopsInitOptions): Promise<{url: string, deleted: boolean}>;
}
