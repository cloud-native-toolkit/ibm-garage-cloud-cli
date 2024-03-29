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
  releaseName?: string;
  isHelm?: boolean;
  ignoreDifferences?: object[];
  cascadingDelete?: boolean;
}

interface ArgocdHelm {
  valueFiles?: string;
  releaseName?: string;
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
  releaseName?: string;
  isHelm?: boolean;
  ignoreDifferences?: object[];
  cascadingDelete?: boolean;

  constructor(config: IArgoApplication) {
    Object.assign(this, config, {server: config.server || 'https://kubernetes.default.svc'});
  }

  buildHelmBlock(): ArgocdHelm | undefined {
    if (!this.isHelm) {
      return undefined
    }

    const result: ArgocdHelm = Object.assign(
      {},
      this.valueFiles && this.valueFiles.length > 0 ? {valueFiles: this.valueFiles} : {},
      this.releaseName ? {releaseName: this.releaseName} : {}
    ) as any

    if (Object.keys(result).length === 0) {
      return undefined
    }

    return result
  }

  asJson(): object {

    const helm: ArgocdHelm | undefined = this.buildHelmBlock()

    const source = Object.assign(
      {
        path: this.sourcePath,
          repoURL: this.sourceRepoUrl,
          targetRevision: this.sourceBranch,
      },
      helm ? {helm} : {}
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
        },
        ignoreDifferences: this.ignoreDifferences || [],
      }
    };

    if (this.cascadingDelete) {
      (applicationResource.metadata as any).finalizers = ['resources-finalizer.argocd.argoproj.io']
    }

    return applicationResource;
  }

  asJsonString(): string {
    return JSON.stringify(this.asJson());
  }

  asYamlString(): string {
    return YAML.dump(this.asJson());
  }
}
