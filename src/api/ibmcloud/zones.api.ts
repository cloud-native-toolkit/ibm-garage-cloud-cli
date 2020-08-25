
export abstract class Zones {
  async abstract getZones(region?: string, provider?: string): Promise<string[]>;
}
