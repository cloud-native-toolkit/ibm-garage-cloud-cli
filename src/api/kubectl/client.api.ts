import {Client1_22 as Client} from '@cloudnativetoolkit/kubernetes-client';

export abstract class KubeBackend {
  abstract getValue(): any;
}
