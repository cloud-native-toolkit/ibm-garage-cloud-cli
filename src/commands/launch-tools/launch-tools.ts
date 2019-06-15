import * as path from 'path';
import * as Docker from 'dockerode';
import * as fs from 'fs';

import {LaunchToolsOptions} from './launch-tools-options.model';

class KeyBuffer {
  private keys: string[] = [];
  constructor(private size: number) {}

  add(key: string): void {
    this.keys.push(key);

    if (this.keys.length > this.size) {
      this.keys = this.keys.slice(1);
    }
  }

  toString(): string {
    return this.keys.join('');
  }
}

const keyBuffer =  new KeyBuffer(6);
const CTRL_P = '\u0010', CTRL_Q = '\u0011';

export async function launchTools(options: LaunchToolsOptions) {

  const socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  const stats = fs.statSync(socket);

  if (!stats.isSocket()) {
    throw new Error('Are you sure the docker is running?');
  }

  const docker = new Docker({socketPath: socket});

  const volumes = {
    '/home/devops/host': {},
    '/home/devops/.kube': {},
    '/home/devops/.helm': {},
  };
  const hostConfig = {
    'Binds': [
      `${process.cwd()}:/home/devops/host`,
      `${process.cwd()}/.kube:/home/devops/.kube`,
      `${process.cwd()}/.helm:/home/devops/.helm`,
    ]
  };

  const env = [];
  if (options.apiKey) {
    env.push(`TF_VAR_ibmcloud_api_key=${options.apiKey}`);
    env.push(`BM_API_KEY=${options.apiKey}`);
  }
  if (options.classicUsername) {
    env.push(`SL_USERNAME=${options.classicUsername}`);
  }
  if (options.classicApiKey) {
    env.push(`SL_API_KEY=${options.classicApiKey}`);
  }

  const container: Docker.Container = await docker.createContainer({
    Image: 'garagecatalyst/ibm-garage-cli-tools:latest',
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    Volumes: volumes,
    HostConfig: hostConfig,
    Env: env,
    WorkingDir: '/home/devops/host',
    OpenStdin: true,
    StdinOnce: false
  });

  await container.start();

  if (fs.existsSync(path.join(process.cwd(), 'src/workspace'))) {
    await container.exec({
      WorkingDir: '/home/devops/host/src/workspace',
      Cmd: ['terraform', 'init'],
    });
  }
  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
    tty: true,
  });

  stream.pipe(process.stdout);

  // Connect stdin
  const isRaw = process.stdin.isRaw;
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.pipe(stream);

  stream.on('end', () => {
    exit(stream, isRaw);
  });
  process.stdin.on('data', (key: string) => {
    keyBuffer.add(key);

    const prevKeys = keyBuffer.toString();
    if (prevKeys.endsWith(CTRL_P + CTRL_Q)) {
      exit(stream, isRaw);
    }
  });
}

function exit(stream, isRaw) {
  process.stdin.removeAllListeners();
  process.stdin.setRawMode(isRaw);
  process.stdin.resume();
  stream.end();
  process.exit();
}
