import {exec as exec, ExecOptions} from 'child_process';

export interface ExecResult {
  stdout: string | Buffer;
  stderr: string | Buffer;
}

export function execPromise(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      options,
      (error: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({stdout, stderr});
      });
  })
}
