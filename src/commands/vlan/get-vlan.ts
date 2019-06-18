import * as path from 'path';
import * as fs from 'fs';
import {execFile} from 'child_process';

import {GetVlanOptions} from './get-vlan-options.model';
import {checkKubeconfig} from '../../util/kubernetes';

export async function getVlan(options: GetVlanOptions) {

  await checkKubeconfig();

  await new Promise((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/get-vlan.sh'),
      [options.region],
      {
        cwd: process.cwd(),
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        resolve({stdout, stderr});
      }
    );

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}
