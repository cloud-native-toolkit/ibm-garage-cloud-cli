import {Client1_13 as Client} from 'kubernetes-client';
import {Container, Inject, Provided, Provider, Provides} from 'typescript-ioc';
const Request = require('kubernetes-client/backends/request');

export abstract class KubeBackend {
  abstract getValue(): any;
}

export class InClusterBackend implements KubeBackend {
  getValue(): any {
    return {
      backend: new Request(Request.config.getInCluster())
    };
  }
}

@Provides(KubeBackend)
export class DefaultBackend implements KubeBackend {
  getValue(): any {
    return { version: '1.13' };
  }
}

class KubeClientProvider implements Provider {
  @Inject
  backend: KubeBackend;

  get(): KubeClient {
    return new Client(this.backend.getValue());
  }
};

@Provided(Container.get(KubeClientProvider))
export class KubeClient extends Client {}

export function buildKubeClient() {
  return Container.get(KubeClient)
}
