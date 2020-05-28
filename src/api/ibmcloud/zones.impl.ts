import {Inject} from 'typescript-ioc';
import {splitLines} from '../../util/string-util';
import {ChildProcess, ExecResult} from '../../util/child-process';
import {Zones} from './zones.api';

export class ZonesImpl implements Zones {
  @Inject
  private childProcess: ChildProcess;

  private readonly ZONE_PREFIX_MAP = {
    'us-south': 'dal',
    'us-east': 'wdc',
    'au-syd': 'syd',
    'jp-tok': 'tok',
    'eu-de': 'fra',
    'eu-gb': 'lon',
  };

  async getZones(region?: string, provider: string = 'classic'): Promise<string[]> {
    return this.childProcess.exec(
      `ibmcloud ks zones --region-only --provider ${provider}`,
      {
        env: process.env
      },
    ).then(({stdout}: ExecResult) => {
      return splitLines(stdout.toString())
        .filter(this.filterZonesForRegion(region))
        .map(zone => zone.trim())
    });
  }

  filterZonesForRegion(region?: string): (zone: string) => boolean {
    if (!region) {
      return (zone: string) => true;
    }

    const zonePrefix =this. getZonePrefix(region);

    return (zone: string) => zone.startsWith(zonePrefix);
  }

  getZonePrefix(regionName: string): string {
    return this.ZONE_PREFIX_MAP[regionName];
  }
}
