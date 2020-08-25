import {Inject} from 'typescript-ioc';
import {ChildProcess} from '../../util/child-process';

export class OpenshiftCommands {
  @Inject
  private childProcess: ChildProcess;

  async startBuild(pipelineName: string, namespace: string = 'default', verbose: boolean = false) {
    return this.childProcess.spawn(
      'oc',
      ['start-build', pipelineName, '-n', namespace],
      {
        env: process.env
      },
      verbose,
    );
  }

  async apply(fileName: string, namespace: string = 'default', verbose: boolean = false) {
    return this.childProcess.spawn(
      'oc',
      ['apply', '-n', namespace, '-f', fileName],
      {
        env: process.env
      },
      verbose,
    );
  }

  async create(fileName: string, namespace: string = 'default', verbose: boolean = false) {
    return this.childProcess.spawn(
      'oc',
      ['create', '-n', namespace, '-f', fileName],
      {
        env: process.env
      },
      verbose,
    );
  }
}
