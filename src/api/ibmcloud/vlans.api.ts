export class IBMCloudVlan {
  type: 'public' | 'private';
  id: string;
  num: number;
  router: string;
}

export class DataCenterVlans {
  [dataCenter: string]: IBMCloudVlan[];
}

export abstract class Vlans {
  abstract getVlans(zone: string): Promise<IBMCloudVlan[]>;
}
