import {AbstractKubernetesResourceManager, KubeResource, ListOptions, Props} from './kubernetes-resource-manager';
import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';

export interface ConfigMap<T = any> extends KubeResource{
  data?: T;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeConfigMap({
    client: context.resolve(AsyncKubeClient),
    name: 'configmaps',
    kind: 'ConfigMap',
  });
};

@Factory(factory)
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
