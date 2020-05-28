import {Client1_13 as Client} from 'kubernetes-client';
import {BuildContext, Container, Factory, ObjectFactory} from 'typescript-ioc';

import {KubeBackend} from './client.api';
import {DefaultBackend} from './client.backend';
const openshiftRestClient = require('openshift-rest-client').OpenshiftClient;

Container.bind(KubeBackend).to(DefaultBackend);

export class KubeClient extends Client {}

export class OcpClient extends Client {}

const kubeClientFactory: ObjectFactory = (context: BuildContext): AsyncKubeClient => {
  const backend: KubeBackend = context.resolve(KubeBackend);

  return new AsyncKubeClient(new Client(backend.getValue()));
}

const ocpClientFactory: ObjectFactory = (): AsyncOcpClient => {
  return new AsyncOcpClient(openshiftRestClient());
}

@Factory(kubeClientFactory)
export class AsyncKubeClient {
  constructor(private _client: KubeClient) {
  }

  async get(): Promise<KubeClient> {
    return this._client;
  }
}

@Factory(ocpClientFactory)
export class AsyncOcpClient {
  constructor(private _client: Promise<OcpClient>) {
  }

  async get(): Promise<OcpClient> {
    return this._client;
  }
}
