import {Client1_13 as Client} from 'kubernetes-client';

export abstract class KubeBackend {
  abstract getValue(): any;
}
