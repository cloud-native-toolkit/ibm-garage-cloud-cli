const {KubeConfig} = require('kubernetes-client');

export class ServerUrl {
  async getServerUrl(): Promise<string> {
    const kubeConfig = new KubeConfig();
    kubeConfig.loadFromDefault();

    const cluster = kubeConfig.getCurrentCluster();

    return cluster.server;
  }
}