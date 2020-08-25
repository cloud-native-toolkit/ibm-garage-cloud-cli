import {Inject} from 'typescript-ioc';
import {ChildProcess} from '../../util/child-process';
import {FromFile} from './from-file.api';

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
