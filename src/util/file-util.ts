import * as fs from 'fs-extra';

export class FsPromises {

  async readFile(filename: string): Promise<Buffer> {
    return fs.readFile(filename);
  }

  async writeFile(fileName: string, contents: any): Promise<string> {
    return fs.writeFile(fileName, contents).then(() => fileName);
  }

  async deleteFile(fileName: string): Promise<string> {
    return fs.unlink(fileName).then(() => fileName);
  }

  async copyFile(fromFile: string, toFile: string): Promise<void> {
    return fs.copy(fromFile, toFile);
  }
}

export class File {
  constructor(public filename: string) {}

  async exists(): Promise<boolean> {
    return fileExists(this.filename);
  }

  async write(contents: string): Promise<void> {
    await fs.writeFile(this.filename, contents);
  }

  async contains(contents: string): Promise<boolean> {
    return fileContains(this.filename, contents);
  }

  async delete(): Promise<void> {
    await fs.remove(this.filename);
  }
}

export const fileContains = async (path: string, contents: string): Promise<boolean> => {
  const result = await fs.readFile(path);

  return result.toString() === contents;
}

export const fileExists = async (path: string): Promise<boolean> => {
  return await fs.access(path, fs.constants.R_OK).then(() => true).catch(err => false);
}
