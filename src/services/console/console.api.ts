
export abstract class GetConsoleUrlApi {
  abstract async getConsoleUrl(params?: {namespace: string}): Promise<string>;
}
