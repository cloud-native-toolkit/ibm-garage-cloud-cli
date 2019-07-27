import * as fs from 'fs';

let read = fs.readFile;
let write = fs.writeFile;
let unlink = fs.unlink;

export async function readFile(filename: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    read(filename, (err, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(data);
    });
  });
}

export async function writeFile(fileName: string, contents: any) {
  return new Promise((resolve, reject) => {
    write(fileName, contents, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  })
}

export async function deleteFile(fileName: string) {
  return new Promise((resolve, reject) => {
    unlink(fileName, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}
