import {Inject} from 'typescript-ioc';
import {OcpProject} from '../api/kubectl';
import {ServerUrl} from './server-url';

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
  private project: OcpProject;
  @Inject
  private serverUrl: ServerUrl;

  async getClusterType(namespace = 'tools'): Promise<{clusterType: 'openshift' | 'kubernetes', serverUrl?: string}> {
    const clusterType = await this.getClusterTypeInternal();

    return {
      clusterType,
      serverUrl: await this.serverUrl.getServerUrl(),
    };
  }

  async getClusterTypeInternal(): Promise<'openshift' | 'kubernetes'> {
    try {
      await this.project.list();

      return 'openshift';
    } catch (err) {
      return 'kubernetes';
    }
  }
}