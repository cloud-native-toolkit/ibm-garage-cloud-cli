
export abstract class FromFile {
  async abstract apply(fileName: string, namespace?: string);
  async abstract create(fileName: string, namespace?: string);
}
