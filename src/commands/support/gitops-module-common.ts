import {Arguments} from 'yargs';
import {Container} from 'typescript-ioc';

import {GitOpsModuleApi, GitOpsModuleOptions} from '../../services/gitops-module';
import {Logger, verboseLoggerFactory} from '../../util/logger';
import {ClaimedMutex, IMutex, Mutex, NoopMutex} from '../../util/mutex';

export const commonHandler = async (argv: Arguments<GitOpsModuleOptions & {debug: boolean, lock: string}>) => {
  Container.bind(Logger).factory(verboseLoggerFactory(argv.debug));

  const logger: Logger = Container.get(Logger);

  const mutex: IMutex = createMutex(argv.lock, argv.tmpDir, 'gitops-module', logger);

  let claim: ClaimedMutex;
  try {
    claim = await mutex.claim({name: argv.name, namespace: argv.namespace, contentDir: argv.contentDir});

    const service: GitOpsModuleApi = Container.get(GitOpsModuleApi);

    await service.populate(argv);
  } catch (err) {
    console.error('Error running populate', err);
  } finally {
    await claim.release();
  }
};

function createMutex(lock: string, tmpDir: string, scope: string, logger: Logger): IMutex {
  if (lock === 'optimistic' || lock === 'o') {
    return new NoopMutex();
  }

  return new Mutex(tmpDir, scope, logger);
}
