import {AbstractKubernetesResourceManager, KubeResource, ListOptions, Props} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {KubeClient} from './client';
import {Secret} from './secrets';

export interface ConfigMap extends KubeResource{
  data?: any;
}

const provider: Provider = {
  get: () => {
    return new KubeConfigMap({
      client: Container.get(KubeClient),
      kind: 'configmaps',
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

  async listData<U>(options: ListOptions, exclude: string[] = []): Promise<U[]> {
    const configMaps: ConfigMap[] = await this.list(options);

    return configMaps
      .filter(configMap => !exclude.includes(configMap.metadata.name))
      .map(configMap => configMap.data);
  }
}
