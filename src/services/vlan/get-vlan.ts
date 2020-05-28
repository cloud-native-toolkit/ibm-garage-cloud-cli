import {Container, Inject} from 'typescript-ioc';
import * as chalk from 'chalk';

import {GetVlanOptions} from './get-vlan-options.model';
import {DataCenterVlans, getIBMCloudTargetInfo, IBMCloudTarget, IBMCloudVlan, Vlans, Zones} from '../../api/ibmcloud';
import {QuestionBuilder} from '../../util/question-builder';
import {GetVlan, NoVlansAvailable, TargetInfo, VlanContainer, VlanResult} from './get-vlan.api';

// export interface FlattenedVlans {
//   private_vlan_id?: string;
//   private_vlan_number?: string;
//   private_vlan_router_hostname?: string;
//   public_vlan_id?: string;
//   public_vlan_number?: string;
//   public_vlan_router_hostname?: string;
// }

const noopNotifyStatus: (status: string) => void = () => {
};

export class GetVlanImpl implements GetVlan {
  @Inject
  private vlans: Vlans;
  @Inject
  private zones: Zones;

  async getVlan(options: GetVlanOptions, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<VlanResult> {

    const targetValues: TargetInfo = await this.collectValuesFromTarget(options, notifyStatus);

    const vlan_datacenters: string[] = await this.getVlanDataCenters(targetValues.vlan_region, notifyStatus, options.datacenter, options.provider);

    const vlanList = await this.getDataCenterVlans(vlan_datacenters, notifyStatus);

    const dataCenter = await this.selectDataCenter(
      Object
        .keys(vlanList)
        .filter(key => vlanList[key].length > 0));

    const {publicVlan, privateVlan} = await this.selectVlansFromDataCenter(dataCenter, vlanList);

    return Object.assign(
      {
        vlan_datacenter: dataCenter,
      },
      await this.flattenVlans([publicVlan, privateVlan]),
      targetValues,
    );
  }

  private async getDataCenterVlans(vlan_datacenters: string[] = [], notifyStatus: (status: string) => void) {
    const vlanList: DataCenterVlans = {};

    for (let i = 0; i < vlan_datacenters.length; i++) {
      const vlan_datacenter = vlan_datacenters[i];

      notifyStatus(`Getting vlans for ${chalk.yellow(vlan_datacenter)}`);
      const vlans: IBMCloudVlan[] = await this.vlans.getVlans(vlan_datacenter);

      vlanList[vlan_datacenter] = vlans;
    }

    return vlanList;
  }

  private async selectVlansFromDataCenter(dataCenter: string, vlanList: DataCenterVlans): Promise<{ publicVlan: IBMCloudVlan, privateVlan: IBMCloudVlan }> {
    const vlanQuestion: QuestionBuilder<{ publicVlan: IBMCloudVlan, privateVlan: IBMCloudVlan }> = Container.get(QuestionBuilder);
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

    return {publicVlan, privateVlan};
  }

  private async selectDataCenter(availableDataCenters: string[]): Promise<string> {
    if (!availableDataCenters || availableDataCenters.length == 0) {
      throw new NoVlansAvailable('Unable to find any vlans in the dataCenters');
    }

    if (availableDataCenters.length == 1) {
      return availableDataCenters[0];
    }

    const dataCenterQuestion: QuestionBuilder<{ dataCenter: string }> = Container.get(QuestionBuilder);
    const {dataCenter} = await dataCenterQuestion
      .question({
        type: 'list',
        choices: availableDataCenters,
        name: 'dataCenter',
        message: 'Which data center would you like to use for the vlan?'
      })
      .prompt();

    return dataCenter;
  }

  async collectValuesFromTarget(options: GetVlanOptions, notifyStatus: (status: string) => void): Promise<TargetInfo> {
    notifyStatus('Getting target info from account');

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

  async getVlanDataCenters(region: string, notifyStatus: (status: string) => void, datacenter?: string, provider: string = 'classic'): Promise<string[]> {

    if (datacenter) {
      notifyStatus(`Using provided datacenter: ${chalk.yellow(datacenter)}`);
    } else {
      notifyStatus(`Getting zones for ${chalk.yellow(region)} region`);
      return await this.zones.getZones(region, provider);
    }
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
