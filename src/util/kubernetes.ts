import * as readline from "readline";
import * as opn from 'open';
import {Container} from 'typescript-ioc';

import {KubeClient} from '../api/kubectl/client';

export async function checkKubeconfig() {
  const kubeClient: KubeClient = Container.get(KubeClient);

  try {
    await kubeClient.api.v1.pods.get();
  } catch (err) {
    console.log('It appears the kubernetes environment has not been initialized.');
    console.log('To initialize kubernetes:');
    console.log(' 1) Navigate to https://cloud.ibm.com/kubernetes/clusters');
    console.log(' 2) Select the kubernetes cluster with which to work');
    console.log(' 3) Follow the instructions on the access tab');
    console.log('');
    process.stdout.write('Open the URL in the default browser? [Y/n]> ');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', function (line) {
      if (line === 'n') {
        throw new Error('Kubernetes not set');
      }

      opn('https://cloud.ibm.com/kubernetes/clusters');
      throw new Error('Kubernetes not set');
    });
  }
}
