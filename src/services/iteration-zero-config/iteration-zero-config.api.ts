import {IterationZeroConfigModel} from './iteration-zero-config.model';
import {VersionMatcher} from '../../model/version-matcher';

export class ModuleNotAvailableForPlatform extends Error {
  constructor(readonly category: string, readonly clusterType: string) {
    super(`Unable to find ${category} module for cluster type: ${clusterType}`);
  }
}

export class ModuleVersionNotFound extends Error {
  constructor(readonly module: {id: string}, readonly version: string | VersionMatcher[]) {
    super(`Unable to find version ${JSON.stringify(version)} for module: ${module.id}`);
  }
}

export class ModuleNotFound extends Error {
  constructor(readonly source: string) {
    super(`Unable to find module: ${source}`);
  }
}

export class ModulesNotFound extends Error {
  readonly sources: string[] = [];

  constructor(moduleRefs: Array<{source: string}>) {
    super(`Unable to find module(s): ${moduleRefs.map(m => m.source)}`);

    this.sources = moduleRefs.map(m => m.source);
  }
}

export abstract class IterationZeroConfigApi {
  abstract buildConfig(options: IterationZeroConfigModel): Promise<any>;
}
