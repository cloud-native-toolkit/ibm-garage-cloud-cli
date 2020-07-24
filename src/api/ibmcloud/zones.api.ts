
export abstract class Zones {
  abstract getZones(region?: string, provider?: string): Promise<string[]>;
}
