import {
  isModule,
  Module,
  ModuleDependency,
  ModuleMatcher,
  ModuleRef,
  ModuleVersion,
  SingleModuleVersion
} from './module-selector.model';
import {LoggerApi} from '../../../logger';
import {Catalog} from '../catalog-loader';
import {Container} from 'typescript-ioc';
import {ModuleNotFound, ModulesNotFound} from '../iteration-zero-config.api';
import {findMatchingVersion, resolveVersions} from '../../../util/version-resolver';

export class SelectedModules {
  readonly modules: {[source: string]: Module} = {};
  readonly moduleRefs: {[source: string]: ModuleRef[]} = {};
  readonly missingModules: ModuleRef[] = [];
  readonly logger: LoggerApi;

  constructor(public readonly catalog: Catalog, ...modules: Module[]) {
    modules.forEach(m => this.addModule(m));
    this.logger = Container.get(LoggerApi).child('SelectedModules');
  }

  addModule(module: Module): SelectedModules {
    if (module) {
      this.modules[module.id] = module;
      this.addModuleRef({source: module.id});
    }

    return this;
  }

  containsModule(module: Module | ModuleRef): boolean {
    if (!module) {
      return false;
    }

    const ref: string = isModule(module) ? module.id : module.source;

    return !!this.modules[ref];
  }

  addModuleRef(moduleRef: ModuleRef): SelectedModules {
    if (moduleRef) {
      const refs = this.moduleRefs[moduleRef.source] ? this.moduleRefs[moduleRef.source] : [];

      refs.push(moduleRef);

      this.moduleRefs[moduleRef.source] = refs;
    }

    return this;
  }

  getCatalogModule(moduleRef: {source: string}): Module {
    if (!moduleRef) {
      throw new ModuleNotFound('<not provided>');
    }

    const modules: Module[] = this.catalog.modules
      .filter(m => m.id === moduleRef.source);

    if (modules.length === 0) {
      throw new ModuleNotFound(moduleRef.source);
    }

    return modules[0];
  }

  addMissingModule(moduleRef: ModuleRef): SelectedModules {
    if (moduleRef) {
      this.missingModules.push(moduleRef);
    }

    return this;
  }

  resolveModules(tools: Module[]): SingleModuleVersion[] {
    tools.forEach(m => this.resolveModuleDependencies(m));

    if (this.hasMissingModules()) {
      throw new ModulesNotFound(this.missingModules);
    }

    return this.resolveModuleVersions();
  }

  resolveModuleDependencies(module: Module) {
    this.addModule(module);

    const dependencies: ModuleDependency[] = module.versions[0].dependencies;
    this.logger.debug('Modules: ', {module: module.name, dependencies});

    if (dependencies) {
      dependencies.forEach(dep => this.resolveModuleDependency(dep));
    }
  }

  resolveModuleDependency(dep: ModuleDependency) {
    if (!dep || !dep.refs || dep.refs.length == 0) {
      return;
    }

    const catalogModules: ModuleRef[] = dep.refs
      .filter(ref => this.getCatalogModule(ref));

    const moduleRefs: ModuleRef[] = catalogModules.length > 1
      ? catalogModules.filter(ref => this.containsModule(ref))
      : catalogModules;

    this.logger.debug('Dependent module refs: ', {moduleRefs});

    if (moduleRefs.length === 1) {
      const moduleRef: ModuleRef = moduleRefs[0];

      if (!this.containsModule(moduleRef)) {
        try {
          const depModule: Module = this.getCatalogModule(moduleRef);

          this.resolveModuleDependencies(depModule);
        } catch (error) {
          this.addMissingModule(moduleRef);
        }
      }

      this.addModuleRef(moduleRef);
    } else if (moduleRefs.length === 0) {
      throw new Error(`Unable to find dependent module: ${dep.refs.map(r => r.source)}`);
    } else {
      throw new Error('dependent module selection is not yet supported');
    }
  }

  hasMissingModules(): boolean {
    return this.missingModules.length > 0;
  }

  reconcileModuleRefs(): ModuleMatcher[] {

    return Object.keys(this.moduleRefs).reduce((moduleRefs: ModuleMatcher[], source: string) => {
      const refs = this.moduleRefs[source];

      moduleRefs.push({source, version: resolveVersions(refs.map(r => r.version))});

      return moduleRefs;
    }, [])
  }

  resolveModuleVersions(): SingleModuleVersion[] {
    const matchers: ModuleMatcher[] = this.reconcileModuleRefs();

    return matchers.map((matcher: ModuleMatcher) => {
      const module: Module = this.getCatalogModule(matcher);

      const version: ModuleVersion = findMatchingVersion(module, matcher.version);

      return Object.assign({}, module, {version});
    });
  }
}
