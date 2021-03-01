
export abstract class FromFile {
  abstract apply(fileName: string, namespace?: string): Promise<string>;
  abstract create(fileName: string, namespace?: string): Promise<string>;
}
