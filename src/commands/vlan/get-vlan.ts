import {GetVlanOptions} from './get-vlan-options.model';
import {getIBMCloudTargetInfo as getTarget, IBMCloudTarget} from '../../api/ibmcloud/target';
import {getZones as ibmcloud_getZones} from '../../api/ibmcloud/zones';
import {getVlans as ibmcloud_getVlans, IBMCloudVlan} from '../../api/ibmcloud/vlans';

// Added variables so that rewire can access them
let getIBMCloudTargetInfo = getTarget;
let getZones = ibmcloud_getZones;
let getVlans = ibmcloud_getVlans;

class VlanContainer {
  private?: IBMCloudVlan;
  public?: IBMCloudVlan;
}

export interface FlattenedVlans {
  private_vlan_id?: string;
  private_vlan_number?: string;
  private_vlan_router_hostname?: string;
  public_vlan_id?: string;
  public_vlan_number?: string;
  public_vlan_router_hostname?: string;
}

export interface TargetInfo {
  vlan_region: string;
  resource_group_name: string;
  cluster_name: string;
}

export interface VlanResult extends FlattenedVlans, TargetInfo {
  vlan_datacenter: string;
}

const noopNotifyStatus: (status: string) => void = () => {};

export async function getVlan(options: GetVlanOptions, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<VlanResult> {

  notifyStatus('Getting target info');

  const targetValues = await collectValuesFromTarget(options);

  notifyStatus('Getting zones');

  const vlan_datacenter: string = await getVlanDatacenter(targetValues.vlan_region);

  notifyStatus('Getting vlans');

  return Object.assign(
    {
      vlan_datacenter,
    },
    await getFlattenedVlans(vlan_datacenter),
    targetValues,
  );
}

async function collectValuesFromTarget(options: GetVlanOptions): Promise<TargetInfo> {

  const target: IBMCloudTarget = await getIBMCloudTargetInfo();

  if (!(options.region || target.region || target.region.name)) {
    throw new Error('Unable to find region value. Make sure that you have run "ibmcloud target -r {region}"');
  }

  const vlan_region = options.region || target.region.name;
  const resource_group_name = (target.resource_group ? target.resource_group.name : '<add resource group>');
  const cluster_name = (target.resource_group ? `${target.resource_group.name}-cluster` : '<add cluster name>');

  return {
    vlan_region,
    resource_group_name,
    cluster_name
  };
}

async function getVlanDatacenter(region: string): Promise<string> {

  const zones: string[] = await getZones(region);

  return zones[0];
}

async function getFlattenedVlans(vlan_datacenter: string): Promise<FlattenedVlans> {
  return flattenVlans(await getVlans(vlan_datacenter));
}

function flattenVlans(vlans: IBMCloudVlan[]): FlattenedVlans {
  return (vlans || []).reduce(
    (result: VlanResult, current: IBMCloudVlan) => {
      if (current.type !== 'public' && current.type !== 'private') {
        return result;
      }

      result[`${current.type}_vlan_id`] = current.id;
      result[`${current.type}_vlan_number`] = current.num;
      result[`${current.type}_vlan_router_hostname`] = current.router;

      return result;
    },
    {}
  );
}
