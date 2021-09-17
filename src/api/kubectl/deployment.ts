import {BuildContext, Factory, Inject, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';
import {AbstractKubernetesNamespacedResource, KubeResource, Props} from './kubernetes-resource-manager';
import {timer} from '../../util/timer';
import {Logger} from '../../util/logger';

export interface Deployment<T = any> extends KubeResource {
  status: {
    availableReplicas: number;
    readyReplicas: number;
    replicas: number;
    updatedReplicas: number;
    unavailableReplicas: number;
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubeDeployment({
    client: context.resolve(AsyncKubeClient),
    group: 'apps',
    version: 'v1',
    name: 'deployments',
    kind: 'Deployment',
  });
};

@Factory(factory)
export class KubeDeployment extends AbstractKubernetesNamespacedResource<Deployment> {
  @Inject logger: Logger;

  constructor(props: Props) {
    super(props);
  }

  async rollout(name: string, namespace: string, timeoutInSeconds: number = 60): Promise<Deployment> {
    const endTime: number = Date.now() + timeoutInSeconds * 1000;
    while (Date.now() <= endTime) {
      try {
        const dep: Deployment = await this.get(name, namespace);

        if (dep.status.availableReplicas > 0) {
          this.logger.debug(`Deployment has at least 1 available replica: ${namespace}/${name}`)
          return dep;
        } else {
          this.logger.debug(`Waiting for available deployment replicas: ${namespace}/${name}`)
        }
      } catch (err) {
        this.logger.debug(`Error getting deployment: ${namespace}/${name}`, err);
      }

      await timer(10 * 1000);
    }

    throw new Error(`Timed out waiting for deployment to rollout: ${namespace}/${name}`);
  }
}
