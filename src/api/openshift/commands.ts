import * as childProcess from '../../util/child-process';

let spawnPromise = childProcess.spawnPromise;

export async function startBuild(pipelineName: string) {
  return spawnPromise(
    'oc',
    ['start-build', pipelineName],
    {
      env: process.env
    });
}
