import {GetVlanOptions} from './get-vlan-options.model';
import {getTarget, IBMCloudTarget} from '../../api/ibmcloud/target';
import {getZones} from '../../api/ibmcloud/zones';
import {getVlans, IBMCloudVlan} from '../../api/ibmcloud/vlans';

class VlanContainer {
  private?: IBMCloudVlan;
  public?: IBMCloudVlan;
}

export class VlanResult {
  private_vlan_number?: string;
  private_vlan_router_hostname?: string;
  public_vlan_number?: string;
  public_vlan_router_hostname?: string;
  vlan_region?: string;
  resource_group_name?: string;
  vlan_datacenter?: string;
}

export async function getVlan(options: GetVlanOptions, notifyStatus: (status: string) => void): Promise<VlanResult> {

  notifyStatus('Getting target info');

  const target: IBMCloudTarget = await getTarget();

  if (!(options.region || target.region || target.region.name)) {
    throw new Error('Unable to find region value. Make sure that you have run "ibmcloud target -r {region}"');
  }

  const resource_group_name = (target.resource_group ? target.resource_group.name : '<add resource group>');
  const vlan_region = options.region || target.region.name;

  notifyStatus('Getting zones');

  const zones: string[] = await getZones(vlan_region);

  const vlan_datacenter: string = zones[0];

  notifyStatus('Getting vlans');

  const vlans: IBMCloudVlan[] = await getVlans(vlan_datacenter);

  return vlans.reduce(
    (result: VlanResult, current: IBMCloudVlan) => {
      result[`${current.type}_vlan_number`] = current.num;
      result[`${current.type}_vlan_router_hostname`] = current.router;

      return result;
    },
    {
      vlan_region,
      vlan_datacenter,
      resource_group_name
    });
}
