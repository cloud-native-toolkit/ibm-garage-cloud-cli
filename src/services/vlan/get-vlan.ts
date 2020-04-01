import {Container, Inject, Provides} from 'typescript-ioc';

import {GetVlanOptions} from './get-vlan-options.model';
import {getIBMCloudTargetInfo, IBMCloudTarget} from '../../api/ibmcloud/target';
import {DataCenterVlans, IBMCloudVlan, Vlans} from '../../api/ibmcloud/vlans';
import {Zones} from '../../api/ibmcloud/zones';
import {QuestionBuilder} from '../../util/question-builder';

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

    const targetValues: TargetInfo = await this.collectValuesFromTarget(options);

    notifyStatus('Getting zones');

    const vlan_datacenters: string[] = options.datacenter ? [options.datacenter] : await this.getVlanDatacenters(targetValues.vlan_region);

    const vlanList: DataCenterVlans = {};

    notifyStatus('Getting vlans');
    for (let i = 0; i < vlan_datacenters.length; i++) {
      const vlan_datacenter = vlan_datacenters[i];

      const vlans: IBMCloudVlan[] = await this.vlans.getVlans(vlan_datacenter);

      vlanList[vlan_datacenter] = vlans;
    }

    const availableDataCenters = Object.keys(vlanList)
      .filter(key => vlanList[key].length > 0);

    const dataCenterQuestion: QuestionBuilder<{dataCenter: string}> = Container.get(QuestionBuilder);
    const {dataCenter} = await dataCenterQuestion
      .question({
        type: 'list',
        choices: availableDataCenters,
        name: 'dataCenter',
        message: 'Which data center would you like to use for the vlan?'
      })
      .prompt();

    const vlanQuestion: QuestionBuilder<{publicVlan: IBMCloudVlan, privateVlan: IBMCloudVlan}> = Container.get(QuestionBuilder);
    const {publicVlan, privateVlan} = await vlanQuestion
      .question({
        type: 'list',
        name: 'publicVlan',
        message: 'Which public vlan would you like to use?',
        choices: vlanList[dataCenter]
          .filter(dc => dc.type === 'public')
          .map(dc => ({name: `${dc.id}/${dc.router}`, value: dc})),
      })
      .question({
        type: 'list',
        name: 'privateVlan',
        message: 'Which private vlan would you like to use?',
        choices: vlanList[dataCenter]
          .filter(dc => dc.type === 'private')
          .map(dc => ({name: `${dc.id}/${dc.router}`, value: dc})),
      })
      .prompt();

    return Object.assign(
      {
        vlan_datacenter: dataCenter,
      },
      await this.flattenVlans([publicVlan, privateVlan]),
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

  async getVlanDatacenters(region: string): Promise<string[]> {

    return await this.zones.getZones(region);
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
