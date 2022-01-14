import {Arguments} from 'yargs';
import {Container} from 'typescript-ioc';

import {GitOpsModuleApi, GitOpsModuleOptions} from '../../services/gitops-module';
import {Logger, verboseLoggerFactory} from '../../util/logger';
import {ClaimedMutex, IMutex, Mutex, NoopMutex} from '../../util/mutex';
import {GitopsModulePRImpl} from '../../services/gitops-module/gitops-module-pr.impl';

export const defaultAutoMerge = (defaultValue: boolean = true): boolean => {
  const autoMerge: string | undefined = process.env.AUTO_MERGE;

  if (autoMerge === undefined || autoMerge === null || autoMerge === '') {
    return defaultValue;
  }

  return autoMerge === 'true';
}

export const defaultRateLimit = (defaultValue: boolean = false): boolean => {
  const rateLimit: string | undefined = process.env.RATE_LIMIT;

  if (rateLimit === undefined || rateLimit === null || rateLimit === '') {
    return defaultValue;
  }

  return rateLimit === 'true';
}

export const commonHandler = async (argv: Arguments<GitOpsModuleOptions & {debug: boolean, lock: string}>) => {
  process.env.VERBOSE_LOGGING = argv.debug ? 'true' : 'false';

  Container.bind(Logger).factory(verboseLoggerFactory(argv.debug));
  if (argv.lock === 'branch' || argv.lock === 'b') {
    Container.bind(GitOpsModuleApi).to(GitopsModulePRImpl);
  }

  const logger: Logger = Container.get(Logger);

  const mutex: IMutex = createMutex(argv.lock, argv.tmpDir, 'gitops-module', logger);

  let claim: ClaimedMutex;
  try {
    claim = await mutex.claim({name: argv.name, namespace: argv.namespace, contentDir: argv.contentDir});

    const service: GitOpsModuleApi = Container.get(GitOpsModuleApi);

    if (argv.delete) {
      await service.delete(argv);
    } else {
      await service.populate(argv);
    }
  } catch (err) {
    console.error('Error running populate', err);
  } finally {
    await claim.release();
  }
};

function createMutex(lock: string, tmpDir: string, scope: string, logger: Logger): IMutex {
  if (lock === 'pessimistic' || lock === 'p') {
    return new Mutex(tmpDir, scope, logger);
  }

  return new NoopMutex();
}
