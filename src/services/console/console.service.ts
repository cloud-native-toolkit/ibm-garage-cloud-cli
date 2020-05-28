import {Inject} from 'typescript-ioc';
import {GetConsoleUrlApi} from './console.api';
import {KubeConfigMap, OcpRoute} from '../../api/kubectl';
import {ClusterType} from '../../util/cluster-type';
import {ChildProcess} from '../../util/child-process';

export class GetConsoleUrlService implements GetConsoleUrlApi {
  @Inject
  clusterType: ClusterType;
  @Inject
  route: OcpRoute;
  @Inject
  kubeConfigMap: KubeConfigMap;
  @Inject
  childProcess: ChildProcess;

  async getConsoleUrl({namespace = 'tools'}: {namespace?: string} = {}): Promise<string> {
    const {clusterType} = await this.clusterType.getClusterType();

    if (clusterType == 'openshift') {
      return this.route.getUrls('openshift-console', 'console').then(urls => urls[0]);
    } else {
      const {clusterName, region} = await this.kubeConfigMap.getData<{CLUSTER_NAME, REGION}>('ibmcloud-config', namespace)
        .then(val => ({
          clusterName: val.CLUSTER_NAME,
          region: val.REGION,
        }));

      const {clusterId} = await this.childProcess.exec(`ibmcloud ks cluster get --cluster ${clusterName} | grep -E "^ID" | sed -E "s/ID: +([^ ]+)/\\1/g"`)
        .then(result => ({clusterId: result.stdout.toString().trim()}));

      return `https://${region}.containers.cloud.ibm.com/kubeproxy/clusters/${clusterId}/service/#/overview?namespace=default`;
    }
  }

}