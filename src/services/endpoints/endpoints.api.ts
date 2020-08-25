
export abstract class GetEndpoints {
  async abstract getEndpoints(namespace?: string, notifyStatus?: (status: string) => void): Promise<Array<{name: string, url: string}>>;
}
