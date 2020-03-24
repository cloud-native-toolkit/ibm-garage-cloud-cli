import {Container, Provided, Provider} from 'typescript-ioc';
import * as _ from 'lodash';

import {AsyncKubeClient, AsyncOcpClient, KubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeBody, KubeResource, Props} from './kubernetes-resource-manager';
import {AbstractKubeNamespace, Namespace} from './namespace';

export interface Project extends KubeResource {
  spec?: {
    finalizers: string[];
  }
  status: any;
}

const provider: Provider = {
  get: () => {
    return new OcpProject({
      client: Container.get(AsyncOcpClient),
    });
  }
};

@Provided(provider)
export class OcpProject implements AbstractKubeNamespace<Project> {
  private client: AsyncKubeClient;

  constructor(props: {client: AsyncKubeClient}) {
    this.client = props.client;
  }

  async create(name: string): Promise<Project> {
    const client: KubeClient = await this.client.get();
    const result: KubeBody<Project> = await client.apis['project.openshift.io'].v1.project.post({body: {
        metadata: {
          name,
        },
      }} as KubeBody<Project>);

    return result.body;
  }

  async exists(name: string): Promise<boolean> {
    try {
      const client: KubeClient = await this.client.get();
      const result = await client.apis['project.openshift.io'].v1.project(name).get();

      if (result) {
        return true;
      }
    } catch (err) {}

    return false;
  }
}
