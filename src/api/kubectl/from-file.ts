import * as childProcess from '../../util/child-process';

let spawnPromise = childProcess.spawnPromise;

export async function apply(fileName: string, namespace: string = 'default') {
  return spawnPromise(
    'kubectl',
    ['apply', '-n', namespace, '-f', fileName],
    {
      env: process.env
    });
}

export async function create(fileName: string, namespace: string = 'default') {
  return spawnPromise(
    'kubectl',
    ['create', '-n', namespace, '-f', fileName],
    {
      env: process.env
    });
}
