import * as YAML from 'js-yaml';

export interface IKustomization {
  resources: string[];
}

export class Kustomization implements IKustomization {
  config: IKustomization;
  resources: string[];

  constructor(config?: IKustomization) {
    Object.assign(
      this,
      config && config.resources ? config : {resources: []},
      config ? {config} : {config: {apiVersion: 'kustomize.config.k8s.io/v1beta1', kind: 'Kustomization'}}
    );
  }

  addResource(resource: string): Kustomization {
    if (!this.resources.includes(resource)) {
      this.resources.push(resource);
    }

    return this;
  }

  asJson() {
    const resource = Object.assign(
      {},
      this.config,
      {
        resources: this.resources
      }
    );

    return resource;
  }

  asJsonString(): string {
    return JSON.stringify(this.asJson());
  }

  asYamlString(): string {
    return YAML.safeDump(this.asJson());
  }
}
