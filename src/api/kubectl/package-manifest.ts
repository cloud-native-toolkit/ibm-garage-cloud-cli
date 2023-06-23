import {BuildContext, Factory, ObjectFactory} from 'typescript-ioc';

import {AsyncKubeClient} from './client';
import {
  AbstractKubernetesNamespacedResource,
  CustomResourceDefinition,
  KubeResource,
  Props
} from './kubernetes-resource-manager';

export interface PackageManifestChannel {
  currentCSV: string
  name: string
}

export interface PackageManifest extends KubeResource {
  spec: {}
  status: {
    catalogSource: string
    catalogSourceDisplayName: string
    catalogSourceNamespace: string
    catalogSourcePublisher: string
    channels: PackageManifestChannel[]
    defaultChannel: string
    packageName: string
  }
}

const factory: ObjectFactory = (context: BuildContext) => {
  const crd: CustomResourceDefinition = {
    apiVersion: 'apiextensions.k8s.io/v1',
    kind: 'CustomResourceDefinition',
    metadata: {
      name: 'packagemanifests.packages.operators.coreos.com',
      annotations: {},
    },
    spec: {
      conversion: {
        strategy: 'None'
      },
      group: 'packages.operators.coreos.com',
      names: {
        categories: ['olm'],
        kind: 'PackageManifest',
        listKind: 'PackageManifestList',
        plural: 'packagemanifests',
        shortNames: [],
        singular: 'packagemanifest',
      },
      scope: 'Namespaced',
      versions: [{
        additionalPrinterColumns: [],
        name: 'v1',
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
              },
              status: {
                type: 'object',
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

  return new KubePackageManifest({
    client: context.resolve(AsyncKubeClient),
    group: 'packages.operators.coreos.com',
    version: 'v1',
    name: 'packagemanifests',
    kind: 'PackageManifest',
    crd,
  });
};

@Factory(factory)
export class KubePackageManifest extends AbstractKubernetesNamespacedResource<PackageManifest> {
  constructor(props: Props) {
    super(props);
  }
}
