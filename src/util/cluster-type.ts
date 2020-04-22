import {Inject} from 'typescript-ioc';
import {KubeConfigMap} from '../api/kubectl';

export function isClusterConfigNotFound(error: Error): error is ClusterConfigNotFound {
  const clusterError: ClusterConfigNotFound = error as ClusterConfigNotFound;

  return !!error && !!clusterError.configMapName;
}

export class ClusterConfigNotFound extends Error {
  constructor(
    message: string,
    public readonly configMapName: string,
    public readonly namespace: string) {

    super(message);
  }
}

interface ClusterConfig {
  CLUSTER_TYPE: 'openshift' | 'kubernetes';
  SERVER_URL?: string;
}

export class ClusterType {
  @Inject
  private kubeConfigMap: KubeConfigMap;

  async getClusterType(namespace = 'tools'): Promise<{clusterType: 'openshift' | 'kubernetes', serverUrl?: string}> {
    return this.kubeConfigMap.getData<ClusterConfig>('cluster-config', namespace)
      .catch(err => this.kubeConfigMap.getData<ClusterConfig>('ibmcloud-config', namespace))
      .then((value: ClusterConfig) => ({clusterType: value.CLUSTER_TYPE, serverUrl: value.SERVER_URL}))
      .catch(err => {
        throw new ClusterConfigNotFound('Config not found', 'ibmcloud-config', namespace);
      });
  }
}