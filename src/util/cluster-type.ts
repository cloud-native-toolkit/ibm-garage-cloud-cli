import {Inject} from 'typescript-ioc';
import {KubeConfigMap, KubeSecret} from '../api/kubectl';

export class ClusterType {
  @Inject
  private kubeConfigMap: KubeConfigMap;
  @Inject
  private kubeSecret: KubeSecret;

  async getClusterType(namespace = 'tools'): Promise<{clusterType: 'openshift' | 'kubernetes', serverUrl?: string}> {
    try {
      const configMap = await this.kubeConfigMap.getData<{ CLUSTER_TYPE: 'openshift' | 'kubernetes', SERVER_URL?: string }>(
        'ibmcloud-config',
        namespace,
      );

      return {clusterType: configMap.CLUSTER_TYPE, serverUrl: configMap.SERVER_URL};
    } catch (configMapError) {

      console.error('Error getting cluster_type from configMap `ibmcloud-config`. Attempting to retrieve it from the secret');

      try {
        const secret = await this.kubeSecret.getData<{cluster_type: 'openshift' | 'kubernetes'}>('ibmcloud-apikey', namespace);

        return {clusterType: secret.cluster_type ? secret.cluster_type : 'kubernetes'};
      } catch (secretError) {
        console.error('Error getting cluster_type from secret `ibmcloud-apikey`. Defaulting to `kubernetes`');

        return {clusterType: 'kubernetes'};
      }
    }
  }
}