import {Container, Inject} from 'typescript-ioc';
import {ChildProcess, ExecResult} from '../../util/child-process';

export class ClusterConfig {
  kubeConfig: string;
}

export class ConfigCluster {
  @Inject
  childProcess: ChildProcess;

  async configCluster(cluster: string): Promise<ClusterConfig> {
    return this.childProcess.exec(
        this.buildCommand(cluster),
        {
          env: process.env
        }).then((result: ExecResult) => {
          return {kubeConfig: this.parseKubeConfig(result.stdout)};
    });
  }

  buildCommand(cluster: string) {
    return `ibmcloud ks cluster-config --cluster ${cluster}`;
  }

  parseKubeConfig(stdout: string | Buffer) {
    return stdout.toString().replace('.*KUBECONFIG=(.*)', '$1');
  }
}

export async function configCluster(cluster: string): Promise<ClusterConfig> {
  return Container.get(ConfigCluster).configCluster(cluster);
}
