import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {
  AbstractKubernetesClusterResource,
  CustomResourceDefinition,
  KubeResource,
  Props
} from './kubernetes-resource-manager';

export interface ClusterVersionDesired {
  image: string
  url: string
  version: string
}

export interface ClusterVersion extends KubeResource {
  spec: {
    clusterID: string
  }
  status: {
    desired: ClusterVersionDesired
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  const group = 'config.openshift.io'
  const version = 'v1'
  const kind = 'ClusterVersion'
  const name = 'clusterversions'
  const singular = 'clusterversion'
  const crd: CustomResourceDefinition = {
    apiVersion: `${group}/${version}`,
    kind,
    metadata: {
      name: `${name}.${group}`,
      annotations: {},
    },
    spec: {
      conversion: {
        strategy: 'None'
      },
      group,
      names: {
        categories: ['openshift'],
        kind,
        listKind: `${kind}List`,
        plural: name,
        shortNames: [],
        singular,
      },
      scope: 'Cluster',
      versions: [{
        additionalPrinterColumns: [],
        name: version,
        schema: {
          openAPIV3Schema: {
            description: 'Subscription keeps operators up to date by tracking changes to Catalogs.',
            properties: {
              apiVersion: {
                description: 'APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources',
                type: 'string',
              },
              kind: {
                description: 'Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds',
                type: 'string',
              },
              metadata: {
                type: 'object',
              },
              spec: {
                type: 'object',
                properties: {
                  channel: {
                    type: 'string'
                  },
                  clusterID: {
                    type: 'string'
                  },
                  desiredUpdate: {
                    type: 'object'
                  },
                  overrides: {
                    type: 'array'
                  },
                  upstream: {
                    type: 'string'
                  }
                }
              },
              status: {
                type: 'object',
                properties: {
                  availableUpdates: {
                    type: 'object'
                  },
                  conditionalUpdates: {
                    type: 'array'
                  },
                  conditions: {
                    type: 'array'
                  },
                  desired: {
                    type: 'object',
                    properties: {
                      channels: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      image: {
                        type: 'string'
                      },
                      url: {
                        type: 'string'
                      },
                      version: {
                        type: 'string'
                      }
                    }
                  },
                  versionHash: {
                    type: 'string'
                  }
                }
              },
            },
          },
        },
      }],
      served: true,
      storage: true,
      subresources: {
        status: {}
      }
    },
  }
  return new KubeClusterVersion({
    client: context.resolve(AsyncKubeClient),
    group,
    version,
    name,
    kind,
    crd,
  });
};

@Factory(factory)
export class KubeClusterVersion extends AbstractKubernetesClusterResource<ClusterVersion> {
  constructor(props: Props) {
    super(props);
  }
}
