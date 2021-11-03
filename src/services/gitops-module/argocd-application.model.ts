import * as YAML from 'js-yaml';

export interface IArgoApplication {
  name: string;
  namespace: string;
  project: string;
  sourcePath: string;
  sourceRepoUrl: string;
  sourceBranch: string;
  valueFiles?: string[];
  server?: string;
}

export class ArgoApplication implements IArgoApplication {
  name: string;
  namespace: string;
  project: string;
  sourcePath: string;
  sourceRepoUrl: string;
  sourceBranch: string;
  valueFiles?: string[];
  server: string;

  constructor(config: IArgoApplication) {
    Object.assign(this, config, {server: config.server || 'https://kubernetes.default.svc'});
  }

  asJson(): object {
    const source = Object.assign(
      {
        path: this.sourcePath,
          repoURL: this.sourceRepoUrl,
          targetRevision: this.sourceBranch,
      },
      this.valueFiles && this.valueFiles.length > 0
        ? {helm: {valueFiles: this.valueFiles}}
        : {}
    );

    const applicationResource = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: this.name,
      },
      spec: {
        destination: {
          namespace: this.namespace,
          server: this.server,
        },
        project: this.project,
        source: source,
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: true,
          }
        }
      }
    };

    return applicationResource;
  }

  asJsonString(): string {
    return JSON.stringify(this.asJson());
  }

  asYamlString(): string {
    return YAML.safeDump(this.asJson());
  }
}
