import * as fse from 'fs-extra';

export class FsPromises {

  async readFile(filename: string): Promise<Buffer> {
    return fse.readFile(filename);
  }

  async writeFile(fileName: string, contents: any): Promise<string> {
    return fse.writeFile(fileName, contents).then(() => fileName);
  }

  async deleteFile(fileName: string): Promise<string> {
    return fse.unlink(fileName).then(() => fileName);
  }

  async copyFile(fromFile: string, toFile: string): Promise<void> {
    return fse.copy(fromFile, toFile);
  }
}
