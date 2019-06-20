import {exec} from 'child_process';
import {splitLines} from '../../util/string-util';

export async function getZones(region?: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec(
      'ibmcloud ks zones --region-only',
      {
        env: process.env
      }, (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (error) {
          reject(error);
        }

        resolve(
          splitLines(stdout.toString())
            .filter(filterZones(region))
            .map(zone => zone.trim())
        );
      });
  });
}

const ZONE_PREFIX_MAP = {
  'us-south': 'dal',
  'us-east': 'wdc',
  'au-syd': 'syd',
  'jp-tok': 'tok',
  'eu-de': 'fra',
  'eu-gb': 'lon',
};

export function getZonePrefix(regionName: string): string {
  return ZONE_PREFIX_MAP[regionName];
}

export function filterZones(region?: string): (zone: string) => boolean {
  if (!region) {
    return (zone: string) => true;
  }

  const zonePrefix = getZonePrefix(region);

  return (zone: string) => zone.startsWith(zonePrefix);
}
