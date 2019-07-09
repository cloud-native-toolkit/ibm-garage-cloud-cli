import {Client1_13 as Client} from 'kubernetes-client';

export function buildKubeClient() {
  return new Client({ version: '1.13' });
}
