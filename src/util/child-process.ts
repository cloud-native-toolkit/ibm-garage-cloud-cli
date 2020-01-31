import {exec, spawn, ExecOptions} from 'child_process';
import {Container, Inject} from 'typescript-ioc';
import {CommandTracker} from '../api/command-tracker/command-tracker';

export interface ExecResult {
  stdout: string | Buffer;
  stderr: string | Buffer;
}

export class ChildProcess {
  @Inject
  commandTracker: CommandTracker;

  async exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      this.commandTracker.record({
        command
      });

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

  async spawn(command: string, args: string[], env: any, verbose: boolean = true): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.commandTracker.record({
        command,
        arguments: args,
        env
      });

      const childProcess = spawn(command, args, env);

      if (verbose) {
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
        process.stdin.pipe(childProcess.stdin);
      }

      let result: string = '';
      childProcess.stdout.on('data', (data: string) => {
        result += data;
      });

      let errorText: string = '';
      childProcess.stderr.on('data', (data: string) => {
        errorText += data;
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(result);
          return;
        }

        reject(new Error(errorText));
      });
    });
  }
}

export async function execPromise(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  return Container.get(ChildProcess).exec(command, options);
}

export async function spawnPromise(command: string, args: string[], env: any, verbose: boolean = true): Promise<string> {
  return Container.get(ChildProcess).spawn(command, args, env, verbose);
}
