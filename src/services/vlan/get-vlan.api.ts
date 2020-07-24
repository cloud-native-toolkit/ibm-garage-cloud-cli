import {GetVlanOptions} from './get-vlan-options.model';
import {IBMCloudVlan} from '../../api/ibmcloud';

export interface TargetInfo {
  vlan_region: string;
  resource_group_name: string;
  cluster_name: string;
}

export class VlanContainer {
  private?: IBMCloudVlan;
  public?: IBMCloudVlan;
}

export interface VlanResult extends VlanContainer, TargetInfo {
  vlan_datacenter: string;
}

export abstract class GetVlan {
  abstract getVlan(options: GetVlanOptions, notifyStatus?: (status: string) => void): Promise<VlanResult>;
}

export class NoVlansAvailable extends Error {
  readonly errorType: 'NoVlansAvailable';

  constructor(message: string) {
    super(message);
  }
}

export function isNoVlansAvailable(error: Error): error is NoVlansAvailable {
  return (!!error) && ((error as NoVlansAvailable).errorType === 'NoVlansAvailable');
}
