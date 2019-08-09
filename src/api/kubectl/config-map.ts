import * as KubeClient from './client';

// required for rewire to work
let buildKubeClient = KubeClient.buildKubeClient;

export interface ConfigMap {
  apiVersion: string;
  kind: 'Secret';
  metadata: {
    name: string;
    namespace?: string;
    labels: any;
    annotations: any;
  }
  data?: any;
}

export async function getConfigMap(configmapName: string, namespace: string): Promise<ConfigMap> {
  const client = buildKubeClient();

  const result = await client.api.v1.namespace(namespace).configmap(configmapName).get();

  return result.body;
}

export async function getConfigMapData<T>(configmapName: string, namespace: string): Promise<T> {
  const client = buildKubeClient();

  const result = await getConfigMap(configmapName, namespace);

  return result.data;
}

export async function createConfigMap<T>(namespace: string, configmapName: string, configmapBody: {body: any}): Promise<ConfigMap> {
  const client = buildKubeClient();

  try {
    await client.api.v1.namespaces(namespace).configmap(configmapName).get();

    const result = await client.api.v1.namespaces(namespace).configmap(configmapName).put(configmapBody);

    return result.body;
  } catch (err) {
    const result = await client.api.v1.namespaces(namespace).configmaps.post(configmapBody);

    return result.body;
  }
}

export async function copyConfigMap(configmapName: string, fromNamespace: string, toNamespace: string): Promise<ConfigMap> {
  const configmap = await getConfigMap(configmapName, fromNamespace);

  const metadata = {
    name: configmapName,
    namespace: toNamespace,
    annotations: configmap.metadata.annotations,
    labels: configmap.metadata.labels
  };

  return createConfigMap(
    toNamespace,
    configmapName,
    {
      body: Object.assign({}, configmap, {metadata})
    },
  );
}
