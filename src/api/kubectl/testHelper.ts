import {ObjectFactory} from 'typescript-ioc';
import {factoryFromBuilder} from '../../testHelper';
import {KubeClient} from './client';

export function buildMockKubeClient(): KubeClient {
  return buildClientNodes({
    api: {
      v1: {
        namespace: {
          configmap: ['get', 'post', 'put'],
          secret: ['get', 'post', 'put'],
          pod: ['get', 'post', 'put'],
        }
      },
      extension: {
        v1beta1: {
          namespace: {
            ingress: ['get', 'post', 'put'],
          },
        },
      },
      'tekton.dev': {
        v1alpha1: {
          pipeline: ['get', 'post', 'put'],
          pipelineresource: ['get', 'post', 'put'],
          task: ['get', 'post', 'put'],
        }
      }
    },
  });
}

export function buildClientNodes(config: any) {
  if (Array.isArray(config)) {
    return config.reduce((result: any, key: string) => {

      result[key] = jest.fn();

      return result;
    }, {});
  }

  return Object.keys(config).reduce((result: any, key: string) => {

    const node: any = jest.fn();

    Object.assign(
      node,
      {toString: () => `kube mock node: ${key}, ${JSON.stringify(config[key])}`},
      buildClientNodes(config[key]),
    );

    node.mockImplementation(() => node);

    result[key] = node;
    result[`${key}s`] = node;

    return result;
  }, {});
}

export const mockKubeClientFactory: ObjectFactory = factoryFromBuilder(buildMockKubeClient);
