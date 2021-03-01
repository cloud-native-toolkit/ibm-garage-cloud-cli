
export abstract class GetDashboardUrl {
  abstract getUrl(namespace: string): Promise<string>;
}
