import * as path from 'path';
import {writeFile} from 'fs';

import {IbmCloudLogin} from './ibmcloud-login.model';
import {login, configCluster} from '../../api/ibmcloud';

export async function ibmcloudLogin(options: IbmCloudLogin): Promise<{kubeConfig: string} | undefined> {
  await login(options);

  const cluster = options.cluster || `${options.resourceGroup}-cluster`;
  try {
    const result: { kubeConfig: string } = await configCluster(cluster);

    await writeKubeConfigFile(result);

    return result;
  } catch (err) {
  }
}

async function writeKubeConfigFile(result: {kubeConfig: string}) {
  return new Promise<void>((resolve, reject) => {
    writeFile(
      path.join(process.cwd(), '.kubeconfig'),
      `export KUBECONFIG=${result.kubeConfig}`,
      (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
  });
}
