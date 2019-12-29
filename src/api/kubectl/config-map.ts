import {AbstractKubernetesResourceManager, KubeResource, ListOptions, Props} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {KubeKindBuilder} from './kind-builder';

export interface ConfigMap<T = any> extends KubeResource{
  data?: T;
}

const provider: Provider = {
  get: () => {
    return new KubeConfigMap({
      client: Container.get(KubeKindBuilder),
      name: 'configmaps',
      kind: 'ConfigMap',
    });
  }
};

@Provided(provider)
export class KubeConfigMap extends AbstractKubernetesResourceManager<ConfigMap> {
  constructor(props: Props) {
    super(props);
  }

  async getData<T>(configmapName: string, namespace: string): Promise<T> {
    const result = await this.get(configmapName, namespace);

    return result.data;
  }

  async listData<U>(options: ListOptions<ConfigMap>, exclude: string[] = []): Promise<U[]> {
    const configMaps: ConfigMap[] = await this.list(options);

    return configMaps
      .filter(configMap => !exclude.includes(configMap.metadata.name))
      .map(configMap => configMap.data);
  }
}
