import {exec} from "child_process";
import {splitLines} from '../../util/string-util';

export class IBMCloudVlan {
  type: 'public' | 'private';
  num: number;
  router: string;
}

export async function getVlans(zone: string): Promise<IBMCloudVlan[]> {
  return new Promise((resolve, reject) => {
    exec(
      `ibmcloud ks vlans --zone ${zone}`,
      {
        env: process.env
      }, (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (error) {
          reject(error);
        }

        resolve(parseVlan(stdout.toString()));
      });
  });
}

export function parseVlan(vlanText: string): IBMCloudVlan[] {
  const rows = splitLines(vlanText);

  return rows
    .filter(row => row.match(/^[0-9]+/))
    .map(parseVlanRow);
}

export function parseVlanRow(vlanText: string): IBMCloudVlan {
  const vlanRegex = new RegExp('^[0-9]+   [a-zA-Z0-9 _-]+   ([0-9]+) +(private|public) +([a-zA-Z0-9.]+) .*', 'g');

  const result = vlanRegex.exec(vlanText);

  return {
    type: result[2] as ('public' | 'private'),
    num: +result[1],
    router: result[3]
  };
}
