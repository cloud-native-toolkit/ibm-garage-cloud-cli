import {Inject, Provides} from 'typescript-ioc';
import {ChildProcess} from '../../util/child-process';

export abstract class FromFile {
  async abstract apply(fileName: string, namespace?: string);
  async abstract create(fileName: string, namespace?: string);
}

@Provides(FromFile)
export class FromFileImpl implements FromFile {
  @Inject
  private childProcess: ChildProcess;

  async apply(fileName: string, namespace: string = 'default') {

    return this.childProcess.spawn(
      'kubectl',
      ['apply', '-n', namespace, '-f', fileName],
      {
        env: process.env
      });
  }

  async create(fileName: string, namespace: string = 'default') {
    return this.childProcess.spawn(
      'kubectl',
      ['create', '-n', namespace, '-f', fileName],
      {
        env: process.env
      });
  }
}
