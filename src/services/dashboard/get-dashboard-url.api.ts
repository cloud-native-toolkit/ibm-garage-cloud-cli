
export abstract class GetDashboardUrl {
  async abstract getUrl(namespace: string): Promise<string>;
}
