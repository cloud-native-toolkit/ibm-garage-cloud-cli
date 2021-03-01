
export abstract class GetConsoleUrlApi {
  abstract getConsoleUrl(params?: {namespace: string}): Promise<string>;
}
