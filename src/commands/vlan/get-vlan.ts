import * as path from 'path';
import {execFile} from 'child_process';

import {GetVlanOptions} from './get-vlan-options.model';

export async function getVlan(options: GetVlanOptions) {

  await new Promise((resolve, reject) => {
    const child = execFile(
      path.join(__dirname, '../../../bin/get-vlan.sh'),
      [],
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
