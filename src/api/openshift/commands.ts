import * as childProcess from '../../util/child-process';

let spawnPromise = childProcess.spawnPromise;

export async function startBuild(pipelineName: string, namespace: string = 'default', verbose: boolean = false) {
  return spawnPromise(
    'oc',
    ['start-build', pipelineName, '-n', namespace],
    {
      env: process.env
    },
    verbose,
  );
}

export async function apply(fileName: string, namespace: string = 'default', verbose: boolean = false) {
  return spawnPromise(
    'oc',
    ['apply', '-n', namespace, '-f', fileName],
    {
      env: process.env
    },
    verbose,
  );
}

export async function create(fileName: string, namespace: string = 'default', verbose: boolean = false) {
  return spawnPromise(
    'oc',
    ['create', '-n', namespace, '-f', fileName],
    {
      env: process.env
    },
    verbose,
  );
}
