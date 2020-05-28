import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';
import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';

export interface Deployment<T = any> extends KubeResource {
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
export class KubeDeployment extends AbstractKubernetesResourceManager<Deployment> {
  constructor(props: Props) {
    super(props);
  }
}
