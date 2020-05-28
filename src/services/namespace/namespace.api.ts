import {NamespaceOptionsModel} from './namespace-options.model';

export abstract class Namespace {
  async abstract getCurrentProject(defaultValue?: string): Promise<string>;

  async abstract setCurrentProject(namespace: string);

  async abstract create(namespaceOptions: NamespaceOptionsModel, notifyStatus?: (status: string) => void): Promise<string>;

  async abstract setupJenkins(namespace: string, templateNamespace: string, clusterType: string, notifyStatus: (status: string) => void);
}
