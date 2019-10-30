import * as fs from 'fs';

export class FsPromises {

  async readFile(filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(filename, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async writeFile(fileName: string, contents: any): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, contents, (err) => {
        if (err) {
          reject(err);
          return;
        } else {
          resolve();
        }
      });
    }).then(() => fileName);
  }

  async deleteFile(fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.unlink(fileName, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }).then(() => fileName);
  }
}
