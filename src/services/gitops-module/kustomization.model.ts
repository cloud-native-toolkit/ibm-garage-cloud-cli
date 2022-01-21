import * as YAML from 'js-yaml';
import {Container} from 'typescript-ioc';

import {File, isFile} from '../../util/file-util';
import {Logger} from '../../util/logger';

export interface IKustomization {
  resources: string[];
}

export class Kustomization implements IKustomization {
  config: IKustomization;
  resources: string[];

  constructor(config?: IKustomization) {
    Object.assign(
      this as any,
      config && config.resources ? config : {resources: []},
      config ? {config} : {config: {apiVersion: 'kustomize.config.k8s.io/v1beta1', kind: 'Kustomization'}}
    );
  }

  addResource(resource: string): Kustomization {
    if (!this.containsResource(resource)) {
      this.resources.push(resource);
      this.resources.sort()
    }

    return this;
  }

  removeResource(resource: string): Kustomization {
    if (this.containsResource(resource)) {
      const index = this.resources.indexOf(resource);

      this.resources.splice(index, 1);
      this.resources.sort();
    }

    return this;
  }

  containsResource(resource: string): boolean {
    return this.resources.includes(resource);
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
    return YAML.dump(this.asJson());
  }
}

export const addKustomizeResource = async (kustomizeFile: string | File, path: string): Promise<boolean> => {

  const file: File = isFile(kustomizeFile) ? kustomizeFile : new File(kustomizeFile);

  const kustomize: Kustomization = await loadKustomize(kustomizeFile);

  if (kustomize.containsResource(path)) {
    return false;
  }

  kustomize.addResource(path);

  return file.write(kustomize.asYamlString()).then(() => true);
};

export const removeKustomizeResource = async (kustomizeFile: string | File, path: string): Promise<boolean> => {

  const logger: Logger = Container.get(Logger);

  const file: File = isFile(kustomizeFile) ? kustomizeFile : new File(kustomizeFile);

  const kustomize: Kustomization = await loadKustomize(kustomizeFile);

  if (kustomize.containsResource(path)) {
    kustomize.removeResource(path);

    logger.debug(`Updated kustomization.yaml file: ${kustomize.asYamlString()}`)
    const result: boolean = await file.write(kustomize.asYamlString()).then(() => true);

    logger.debug(`  File changed: ${result}`)
    return result;
  } else {
    logger.debug(`Kustomize does not contain resource: ${path}`, {resources: kustomize.resources})
  }

  return false;
};

export const loadKustomize = async (kustomizeFile: File | string): Promise<Kustomization> => {

  const file: File = isFile(kustomizeFile) ? kustomizeFile : new File(kustomizeFile);

  if (!await file.exists()) {
    return new Kustomization();
  }

  const kustomize: IKustomization = await file.readYaml();

  return new Kustomization(kustomize);
}
