import {promises as fsPromises} from 'fs';
import {join} from 'path';

import {LocalGitApi} from './git.api';
import {ChildProcess} from '../../util/child-process';

export class LocalGitRepo implements LocalGitApi {
  constructor(private repoPath: string = process.cwd()) {}

  async listFiles(): Promise<Array<{path: string, url?: string}>> {
    const files: string[] = await fsPromises.readdir(this.repoPath);

    const filenames = files.map(filename => ({
      path: filename
    }));

    return filenames;
  }

  async getFileContents(fileDescriptor: {path: string, url?: string}): Promise<string | Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      resolve(fsPromises.readFile(join(this.repoPath, fileDescriptor.path)));
    });
  }

  async getDefaultBranch(): Promise<string> {
    const childProcess: ChildProcess = new ChildProcess();

    return childProcess.exec('git remote show upstream | grep "HEAD branch" | sed "s/.*: //"')
      .then(({stdout, stderr}: {stdout: string, stderr: string}) => stdout);
  }

}
