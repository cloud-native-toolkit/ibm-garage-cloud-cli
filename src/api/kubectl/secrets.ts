import {Client1_13 as Client} from 'kubernetes-client';

import {decode as base64decode} from '../../util/base64';

export async function getSecretData<T>(secretName: string, namespace: string): Promise<T> {
  const client = buildKubeClient();

  const result = await client.api.v1.namespace(namespace).secrets(secretName).get();

  const values = result.body.data;

  return Object.keys(values).reduce((decodedResults, currentKey) => {
    decodedResults[currentKey] = base64decode(values[currentKey]);

    return decodedResults;
  }, {} as T);
}

export function buildKubeClient() {
  return new Client({ version: '1.13' });
}
