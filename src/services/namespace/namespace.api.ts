import {NamespaceOptionsModel} from './namespace-options.model';

export abstract class Namespace {
  abstract getCurrentProject(defaultValue?: string): Promise<string>;

  abstract setCurrentProject(namespace: string): Promise<void>;

  abstract pullSecret(namespaceOptions: NamespaceOptionsModel, notifyStatus: (status: string) => void): Promise<string>;

  abstract create(namespaceOptions: NamespaceOptionsModel, notifyStatus?: (status: string) => void): Promise<string>;

  abstract setupJenkins(namespace: string, templateNamespace: string, clusterType: string, notifyStatus: (status: string) => void): Promise<void>;
}
