import {exec} from 'child_process';

export class ClusterConfig {
  kubeConfig: string;
}

export async function configCluster(cluster: string): Promise<ClusterConfig> {
  return new Promise((resolve, reject) => {
    exec(
      buildCommand(cluster),
      {
        env: process.env
      }, (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (error) {
          reject(error);
        }

        resolve({kubeConfig: parseKubeConfig(stdout)});
      });
  });
}

function buildCommand(cluster: string) {
  return `ibmcloud ks cluster-config --cluster ${cluster}`;
}

function parseKubeConfig(stdout: string | Buffer) {
  return stdout.toString().replace('.*KUBECONFIG=(.*)', '$1');
}
