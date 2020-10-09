import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, ListOptions, Props} from './kubernetes-resource-manager';
import {decode as base64decode} from '../../util/base64';

export interface Secret<T = any> extends KubeResource {
  type: string;
  stringData?: T;
  data?: T;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeSecret({
    client: context.resolve(AsyncKubeClient),
    name: 'secrets',
    kind: 'Secret',
  });
};

@Factory(factory)
export class KubeSecret extends AbstractKubernetesResourceManager<Secret> {
  constructor(props: Props) {
    super(props);
  }

  async getData<U>(secretName: string, namespace: string): Promise<U> {
    const secret: Secret<U> = await this.get(secretName, namespace);

    if (!secret || !secret.data) {
      return {} as any;
    }

    return this.decodeSecretData(secret.data);
  }

  decodeSecretData<U>(secretData: U): U {
    return Object.keys(secretData).reduce((decodedResults, currentKey) => {
      if (secretData[currentKey]) {
        decodedResults[currentKey] = base64decode(secretData[currentKey]);
      }

      return decodedResults;
    }, {} as U);
  }

  async listData<U>(options: ListOptions<Secret>, exclude: string[] = []): Promise<U[]> {
    const secrets: Secret[] = await this.list(options);

    return secrets
      .filter(secret => !exclude.includes(secret.metadata.name))
      .map(secret => secret.data)
      .map(this.decodeSecretData);
  }
}
