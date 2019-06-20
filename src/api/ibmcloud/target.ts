import {exec} from 'child_process';

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

export async function getTarget(): Promise<IBMCloudTarget> {
  return new Promise((resolve, reject) => {
    exec(
      'ibmcloud target --output json',
      {
        env: process.env
      }, (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (error) {
          reject(error);
        }

        resolve(JSON.parse(stdout.toString()));
      });
  });
}
