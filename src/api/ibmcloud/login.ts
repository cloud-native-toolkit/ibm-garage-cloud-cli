import {exec, spawn} from 'child_process';

export class LoginRequest {
  apiKey?: string;
  region: string;
  resourceGroup: string;
  sso?: boolean;
}

export async function login(options: LoginRequest): Promise<any> {
  return new Promise<void>((resolve, reject) => {
    const loginProcess = spawn(
      'ibmcloud',
      buildCommandArguments(options),
      {
        env: process.env
      });

    loginProcess.stdout.pipe(process.stdout);
    loginProcess.stderr.pipe(process.stderr);
    process.stdin.pipe(loginProcess.stdin);

    loginProcess.on('exit', code => {
      if (code === 0) {
        resolve();
      }

      reject();
    });
  });
}

function buildCommandArguments(options: LoginRequest): string[] {
  const args = ['login', '-r', options.region, '-g', options.resourceGroup];

  if (options.apiKey) {
    args.push('--apikey');
    args.push(options.apiKey);
  } else if (options.sso) {
    args.push('--sso');
  }

  return args;
}
