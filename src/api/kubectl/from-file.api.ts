
export abstract class FromFile {
  abstract apply(fileName: string, namespace?: string);
  abstract create(fileName: string, namespace?: string);
}
