import {Container} from 'typescript-ioc';
import {Arguments, Argv} from 'yargs';

import {GetVlan, GetVlanOptions, isNoVlansAvailable, VlanResult} from '../services/vlan';
import {FsPromises} from '../util/file-util';
import {Logger, VerboseLogger} from '../util/logger';

export const command = 'vlan';
export const desc = 'Print out the vlan values';
export const builder = (yargs: Argv<any>) => yargs
  .option('datacenter', {
    alias: 'd',
    describe: 'the datacenter to use. if not provided it will use the first one listed for the region'
  })
  .option('provider', {
    alias: 'p',
    describe: 'the provider: classic or vlan',
    default: 'classic'
  })
  .option('output', {
    alias: 'o',
    describe: 'the optional fileName where the output should be written',
    require: false,
  })
  .option('debug', {
    describe: 'Flag to output additional information',
    require: false,
    type: 'boolean'
  });
exports.handler = async (argv: Arguments<GetVlanOptions & {debug: boolean}>) => {
  try {
    const spinner: Logger = new VerboseLogger();

    function statusCallback(status: string) {
      spinner.text = status;
    }

    const command: GetVlan = Container.get(GetVlan);
    const result: VlanResult = await command.getVlan(argv, statusCallback);

    spinner.stop();

    if (argv.output) {
      const fileUtil: FsPromises = Container.get(FsPromises);

      await fileUtil.writeFile(argv.output, buildResult(result));
    } else {
      console.log(buildResult(result));
    }
  } catch (err) {
    if (isNoVlansAvailable(err)) {
      console.log(err.message);
    } else {
      console.log('An error occurred retrieving the vlans', argv.debug ? err : '');
    }

    process.exit(1);
  }
};

function buildResult(result: VlanResult): string {
  return `# Vlan config
# The following values tell the IBMCloud terraform provider the details about the new
# cluster it will create.
# If \`cluster_exists\` is set to \`true\` then these values are not needed
#
# These values apply to the following config:
# resource group: ${result.resource_group_name}
# region: ${result.vlan_region}
#
# The vlans selected are (id/num/router):
# public_vlan: ${result.public.id}/${result.public.num}/${result.public.router}
# private_vlan: ${result.private.id}/${result.private.num}/${result.private.router}
#
vlan_datacenter="${result.vlan_datacenter}"
public_vlan_id="${result.public.id}"
private_vlan_id="${result.private.id}"
`;
}
