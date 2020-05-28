import {AbstractKubernetesResourceManager, KubeResource, Props} from './kubernetes-resource-manager';
import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';
import {AsyncKubeClient} from './client';

export interface Pod extends KubeResource{
  spec: any;
}

const factory: ObjectFactory = (context: BuildContext) => {
  return new KubePod({
    client: context.resolve(AsyncKubeClient),
    name: 'pod',
    kind: 'Pod',
  });
};

@Factory(factory)
export class KubePod extends AbstractKubernetesResourceManager<Pod> {
  constructor(props: Props) {
    super(props);
  }
}
