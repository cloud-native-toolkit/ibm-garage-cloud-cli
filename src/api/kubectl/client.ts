import {Client1_13 as Client} from 'kubernetes-client';
import {Container, Provided, Provider} from 'typescript-ioc';

export function buildKubeClient(): KubeClient {
  return new Client({ version: '1.13' });
}

const kubeClientProvider: Provider = {
  get(): KubeClient {
    return buildKubeClient();
  }
};

@Provided(kubeClientProvider)
export class KubeClient extends Client {}
