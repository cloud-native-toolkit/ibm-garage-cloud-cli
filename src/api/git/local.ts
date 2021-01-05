import {LocalGitApi} from './git.api';
import fs from 'fs';
import path from 'path';

export class LocalGitRepo implements LocalGitApi {
  constructor(private repoPath: string = process.cwd()) {}

  async listFiles(): Promise<Array<{path: string, url?: string}>> {
    const files: string[] = await fs.promises.readdir(this.repoPath);

    return files.map(filename => ({
      path: filename
    }));
  }

  async getFileContents(fileDescriptor: {path: string, url?: string}): Promise<string | Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      console.log('Executing file read: ' + fileDescriptor.path);
      resolve(fs.promises.readFile(path.join(this.repoPath, fileDescriptor.path)));
    });
  }
}
