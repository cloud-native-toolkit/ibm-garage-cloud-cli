import * as readline from "readline";
import * as opn from 'open';

export async function checkKubeconfig() {
  return new Promise((resolve, reject) => {
    if (!process.env.KUBECONFIG) {
      console.log('KUBECONFIG environment variable not found. It appears the kubernetes environment has not been initialized.');
      console.log('To initialize the kubernetes:');
      console.log(' 1) Navigate to https://cloud.ibm.com/kubernetes/clusters');
      console.log(' 2) Select the kubernetes cluster');
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
          reject(new Error('KUBECONFIG not set'));
        }

        opn('https://cloud.ibm.com/kubernetes/clusters');
        reject(new Error('KUBECONFIG not set'));
      });
    } else {
      resolve();
    }
  });
}
