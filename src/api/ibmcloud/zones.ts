import {splitLines} from '../../util/string-util';
import * as cp from '../../util/child-process';

let execPromise = cp.execPromise;

export async function getZones(region?: string): Promise<string[]> {
  return execPromise(
      'ibmcloud ks zones --region-only',
      {
        env: process.env
      },
    ).then(({stdout}: cp.ExecResult) => {
        return splitLines(stdout.toString())
          .filter(filterZonesForRegion(region))
          .map(zone => zone.trim())
    });
}

function filterZonesForRegion(region?: string): (zone: string) => boolean {
  if (!region) {
    return (zone: string) => true;
  }

  const zonePrefix = getZonePrefix(region);

  return (zone: string) => zone.startsWith(zonePrefix);
}

const ZONE_PREFIX_MAP = {
  'us-south': 'dal',
  'us-east': 'wdc',
  'au-syd': 'syd',
  'jp-tok': 'tok',
  'eu-de': 'fra',
  'eu-gb': 'lon',
};

function getZonePrefix(regionName: string): string {
  return ZONE_PREFIX_MAP[regionName];
}
