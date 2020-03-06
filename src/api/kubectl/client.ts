import {Client1_13 as Client} from 'kubernetes-client';
import {Container, Inject, Provided, Provider, Provides} from 'typescript-ioc';
const openshiftRestClient = require('openshift-rest-client').OpenshiftClient;

const Request = require('kubernetes-client/backends/request');

export class KubeClient extends Client {}

export class OcpClient extends Client {}

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

  get(): AsyncKubeClient {
    return new AsyncKubeClient(new Client(this.backend.getValue()));
  }
}

class OcpClientProvider implements Provider {
  @Inject
  backend: KubeBackend;

  get(): AsyncOcpClient {
    return new AsyncOcpClient(openshiftRestClient());
  }
}

@Provided(Container.get(KubeClientProvider))
export class AsyncKubeClient {
  constructor(private _client: KubeClient) {
  }

  async get(): Promise<KubeClient> {
    return this._client;
  }
}

export function buildKubeClient() {
  return Container.get(KubeClient)
}

@Provided(Container.get(OcpClientProvider))
export class AsyncOcpClient {
  constructor(private _client: Promise<OcpClient>) {
  }

  async get(): Promise<OcpClient> {
    return this._client;
  }
}
