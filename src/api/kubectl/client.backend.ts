import {KubeBackend} from './client.api';

const Request = require('kubernetes-client/backends/request');

export class InClusterBackend implements KubeBackend {
  getValue(): any {
    return {
      backend: new Request(Request.config.getInCluster())
    };
  }
}

export class DefaultBackend implements KubeBackend {
  getValue(): any {
    return { version: '1.13' };
  }
}
