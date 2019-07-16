import {exec} from 'child_process';
import {execPromise, ExecResult} from '../../util/child_process';

export class IBMCloudAccount {
  guid: string;
  name: string;
  owner: string;
}

export class IBMCloudRegion {
  mccp_id: string;
  name: string;
}

export class IBMCloudResourceGroup {
  default: boolean;
  guid: string;
  name: string;
  state: string;
}

export class IBMCloudUser {
  display_name: string;
  user_email: string;
}

export class IBMCloudTarget {
  account: IBMCloudAccount;
  api_endpoint: string;
  region: IBMCloudRegion;
  resource_group: IBMCloudResourceGroup;
  user: IBMCloudUser;
}

export async function getIBMCloudTargetInfo(): Promise<IBMCloudTarget> {
  return execPromise(
      'ibmcloud target --output json',
      {
        env: process.env
      },
  ).then(({stdout}: ExecResult) => JSON.parse(stdout.toString()))
}
