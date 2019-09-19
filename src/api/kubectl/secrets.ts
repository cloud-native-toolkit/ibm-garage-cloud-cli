import {decode as base64decode} from '../../util/base64';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {Container, Provided, Provider} from 'typescript-ioc';
import {KubeClient} from './client';

export interface Secret extends KubeResource {
  type: string;
  stringData?: any;
  data?: any;
}

const provider: Provider = {
  get: () => {
    return new KubeSecret({
      client: Container.get(KubeClient),
      kind: 'secrets',
    });
  }
};

@Provided(provider)
export class KubeSecret extends AbstractKubernetesResourceManager<Secret> {
  constructor(props: Props) {
    super(props);
  }

  async getData<U>(secretName: string, namespace: string): Promise<U> {
    const secret: Secret = await this.get(secretName, namespace);

    const values = secret.data;

    return Object.keys(values).reduce((decodedResults, currentKey) => {
      decodedResults[currentKey] = base64decode(values[currentKey]);

      return decodedResults;
    }, {} as U);
  }
}
