import {exec, spawn, ExecOptions} from 'child_process';

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

export async function spawnPromise(command: string, args: string[], env: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const childProcess = spawn(command, args, env);

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
    process.stdin.pipe(childProcess.stdin);

    let result: string = '';
    childProcess.stdout.on('data', (data: string) => {
      result += data;
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(result);
        return;
      }

      reject();
    });
  });
}
