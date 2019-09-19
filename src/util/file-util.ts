import * as fs from 'fs';

export class FsPromises {

  async readFile(filename: string): Promise<Buffer> {
    return fs.promises.readFile(filename);
  }

  async writeFile(fileName: string, contents: any): Promise<string> {
    return fs.promises.writeFile(fileName, contents).then(() => fileName);
  }

  async deleteFile(fileName: string): Promise<string> {
    return fs.promises.unlink(fileName).then(() => fileName);
  }
}
