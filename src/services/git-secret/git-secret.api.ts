import {GitParams} from './git-params.model';

export const SECRET_NAME = 'git-credentials';

export interface GitSecretParams {
  gitParams: GitParams;
  namespaces: string | string[];
  additionalParams: any;
  replace?: boolean;
  name?: string;
  notifyStatus?: (s: string) => void;
}

export abstract class GitSecret {
  abstract create(params: GitSecretParams): Promise<{secretName: string, configMapName: string}>;
}
