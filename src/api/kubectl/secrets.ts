import * as KubeClient from './client';
import {decode as base64decode} from '../../util/base64';

// required for rewire to work
let buildKubeClient = KubeClient.buildKubeClient;

export async function getSecretData<T>(secretName: string, namespace: string): Promise<T> {
  const client = buildKubeClient();

  const result = await client.api.v1.namespace(namespace).secrets(secretName).get();
  const result1 = await client.apis.extension.v1beta1.namespace(namespace).ingress(secretName).get();

  const values = result.body.data;

  return Object.keys(values).reduce((decodedResults, currentKey) => {
    decodedResults[currentKey] = base64decode(values[currentKey]);

    return decodedResults;
  }, {} as T);
}
