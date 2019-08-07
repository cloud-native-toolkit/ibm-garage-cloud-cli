import {splitLines} from '../../util/string-util';
import * as cp from '../../util/child-process';

let execPromise = cp.execPromise;

export class IBMCloudVlan {
  type: 'public' | 'private';
  id: string;
  num: number;
  router: string;
}

export async function getVlans(zone: string): Promise<IBMCloudVlan[]> {
  return execPromise(
      `ibmcloud ks vlans --zone ${zone}`,
      {
        env: process.env
      },
    ).then((result: cp.ExecResult) => parseVlan(result.stdout.toString()));
}

function parseVlan(vlanText: string): IBMCloudVlan[] {
  const rows = splitLines(vlanText);

  return rows
    .filter(row => row.match(/^[0-9]+/))
    .map(parseVlanRow);
}

function parseVlanRow(vlanText: string): IBMCloudVlan {
  const vlanRegex = new RegExp('^([0-9]+)   [a-zA-Z0-9 _-]+   ([0-9]+) +(private|public) +([a-zA-Z0-9.]+) .*', 'g');

  const result = vlanRegex.exec(vlanText);

  return {
    id: result[1],
    type: result[3] as ('public' | 'private'),
    num: +result[2],
    router: result[4]
  };
}
