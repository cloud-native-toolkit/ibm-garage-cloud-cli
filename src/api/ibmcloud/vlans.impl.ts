import {Inject} from 'typescript-ioc';
import {splitLines} from '../../util/string-util';
import * as cp from '../../util/child-process';
import {ChildProcess} from '../../util/child-process';
import {IBMCloudVlan, Vlans} from './vlans.api';

export class VlansImpl implements Vlans {
  @Inject
  childProcess: ChildProcess;

  async getVlans(zone: string): Promise<IBMCloudVlan[]> {
    return this.childProcess.exec(
      `ibmcloud ks vlans --zone ${zone}`,
      {
        env: process.env
      },
    ).then((result: cp.ExecResult) => this.parseVlan(result.stdout.toString()));
  }

  parseVlan(vlanText: string): IBMCloudVlan[] {
    const rows = splitLines(vlanText);

    return rows
      .filter(row => row.match(/^[0-9]+/))
      .map(this.parseVlanRow);
  }

  parseVlanRow(vlanText: string): IBMCloudVlan {
    const vlanRegex = new RegExp('^([0-9]+)   [a-zA-Z0-9 _-]+   ([0-9]+) +(private|public) +([a-zA-Z0-9.]+) .*', 'g');

    const result = vlanRegex.exec(vlanText);

    return {
      id: result[1],
      type: result[3] as ('public' | 'private'),
      num: +result[2],
      router: result[4]
    };
  }
}
