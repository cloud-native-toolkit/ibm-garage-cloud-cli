import {LocalGitApi} from './git.api';
import fs from 'fs';
import path from 'path';
import {ChildProcess} from '../../util/child-process';

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

  async getDefaultBranch(): Promise<string> {
    const childProcess: ChildProcess = new ChildProcess();

    return childProcess.exec('git remote show upstream | grep "HEAD branch" | sed "s/.*: //"')
      .then(({stdout, stderr}: {stdout: string, stderr: string}) => stdout);
  }

}
