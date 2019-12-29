import {Provider} from 'typescript-ioc';
import * as _ from 'lodash';

import {KubeClient} from './client';
import {providerFromBuilder} from '../../testHelper';

export function buildMockKubeClient(): KubeClient {
  return buildClientNodes({
    api: [{
      version: 'v1',
      resources: [
        'configmap',
        'secret',
        'pod',
      ]
    }],
    apis: [{
      group: 'extension',
      version: 'v1beta1',
      resources: [
        'ingress',
      ],
    }, {
      group: 'tekton.dev',
      version: 'v1alpha1',
      resources: [
        'pipeline',
        'pipelineresource',
        'task',
      ],
    }, {
      group: 'apiextensions.k8s.io',
      version: 'v1beta1',
      resources: ['customresourcedefinitions'],
      cluster: true,
    }],
  });
}

interface KubeGroup {
  group?: string;
  version: string;
  resources: string[];
  cluster?: boolean;
}

interface KubeClientConfig {
  api: KubeGroup[];
  apis: KubeGroup[];
}

function pluralResource(name: string): string {
  return name.endsWith('s') ? `${name}es` : `${name}s`;
}

function apiGroup({group, version}: {group?: string, version: string}): string[] {

  return group ? [group, version] : [version];
}

function buildResources(resources: string[]) {
  return resources.reduce((root: any, resource: string) => {
    const instanceNode = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    const node = Object.assign(
      jest.fn(() => instanceNode),
      {
        get: jest.fn(),
        post: jest.fn(),
        _instance: instanceNode,
      },
    );

    root[resource] = node;
    root[pluralResource(resource)] = node;

    return root;
  }, {});
}

function buildKubeGroups(groups: KubeGroup[] = []) {
  return groups.reduce((result: any, group: KubeGroup) => {
    if (!group.cluster) {
      const namespace = Object.assign(
        jest.fn(() => namespace),
        buildResources(group.resources),
      );

      _.set(result, apiGroup(group).concat('namespace'), namespace);
    } else {
      _.set(result, apiGroup(group), buildResources(group.resources));
    }
    return result;
  }, {});
}

export function buildClientNodes(config: KubeClientConfig): KubeClient {
  return {
    api: buildKubeGroups(config.api),
    apis: buildKubeGroups(config.apis),
    addCustomResourceDefinition: jest.fn(),
  } as any;
}

export const mockKubeClientProvider: Provider = providerFromBuilder(buildMockKubeClient);
