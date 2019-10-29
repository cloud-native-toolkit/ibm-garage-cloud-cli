import {Inject, Provides} from 'typescript-ioc';

import {GetVlanOptions} from './get-vlan-options.model';
import {getIBMCloudTargetInfo, IBMCloudTarget} from '../../api/ibmcloud/target';
import {IBMCloudVlan, Vlans} from '../../api/ibmcloud/vlans';
import {Zones} from '../../api/ibmcloud/zones';

class VlanContainer {
  private?: IBMCloudVlan;
  public?: IBMCloudVlan;
}

// export interface FlattenedVlans {
//   private_vlan_id?: string;
//   private_vlan_number?: string;
//   private_vlan_router_hostname?: string;
//   public_vlan_id?: string;
//   public_vlan_number?: string;
//   public_vlan_router_hostname?: string;
// }

export interface TargetInfo {
  vlan_region: string;
  resource_group_name: string;
  cluster_name: string;
}

export interface VlanResult extends VlanContainer, TargetInfo {
  vlan_datacenter: string;
}

const noopNotifyStatus: (status: string) => void = () => {};

export abstract class GetVlan {
  async abstract getVlan(options: GetVlanOptions, notifyStatus?: (status: string) => void): Promise<VlanResult>;
}

@Provides(GetVlan)
export class GetVlanImpl implements GetVlan {
  @Inject
  private vlans: Vlans;
  @Inject
  private zones: Zones;

  async getVlan(options: GetVlanOptions, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<VlanResult> {

    notifyStatus('Getting target info');

    const targetValues = await this.collectValuesFromTarget(options);

    notifyStatus('Getting zones');

    const vlan_datacenter: string = options.datacenter || await this.getVlanDatacenter(targetValues.vlan_region);

    notifyStatus('Getting vlans');

    return Object.assign(
      {
        vlan_datacenter,
      },
      await this.getFlattenedVlans(vlan_datacenter),
      targetValues,
    );
  }

  async collectValuesFromTarget(options: GetVlanOptions): Promise<TargetInfo> {

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

  async getVlanDatacenter(region: string): Promise<string> {

    const zones: string[] = await this.zones.getZones(region);

    return zones[0];
  }

  async getFlattenedVlans(vlan_datacenter: string): Promise<VlanContainer> {
    return this.flattenVlans(await this.vlans.getVlans(vlan_datacenter));
  }

  flattenVlans(vlans: IBMCloudVlan[]): VlanContainer {
    return (vlans || []).reduce(
      (result: VlanContainer, current: IBMCloudVlan) => {
        if (current.type !== 'public' && current.type !== 'private') {
          return result;
        }

        result[current.type] = current;

        return result;
      },
      {}
    );
  }
}
