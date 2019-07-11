import * as KubeClient from './client';
import {decode as base64decode} from '../../util/base64';

// required for rewire to work
let buildKubeClient = KubeClient.buildKubeClient;

export async function getSecretData<T>(secretName: string, namespace: string): Promise<T> {
  const client = buildKubeClient();

  const result = await client.api.v1.namespace(namespace).secrets(secretName).get();

  const values = result.body.data;

  return Object.keys(values).reduce((decodedResults, currentKey) => {
    decodedResults[currentKey] = base64decode(values[currentKey]);

    return decodedResults;
  }, {} as T);
}

export async function createSecret<T>(namespace: string, secretName: string, secretBody: any) {
  const client = buildKubeClient();

  try {
    await client.api.v1.namespaces(namespace).secrets(secretName).get();

    const result = await client.api.v1.namespaces(namespace).secrets(secretName).put(secretBody);

    return result.body;
  } catch (err) {
    const result = await client.api.v1.namespaces(namespace).secrets.post(secretBody);

    return result.body;
  }
}
