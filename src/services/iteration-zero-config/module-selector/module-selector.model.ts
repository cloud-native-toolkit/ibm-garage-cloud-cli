import {VersionMatcher} from '../../../model/version-matcher';
import {BaseVariable, StagePrinter} from '../variables.model';

export interface ModuleRef {
  source: string;
  version?: string;
}

export interface ModuleMatcher {
  source: string;
  version: VersionMatcher[];
}

export interface ModuleTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  platforms: string[];
  tags?: string[];
}

export interface Module extends ModuleTemplate {
  versions: ModuleVersion[];
}

export function isModule(module: Module | ModuleRef): module is Module {
  return !!module && !!(module as Module).id;
}

export function isModuleRef(module: Module | ModuleRef): module is ModuleRef {
  return !!module && !!(module as ModuleRef).source;
}

export interface SingleModuleVersion extends ModuleTemplate {
  version: ModuleVersion;
}

export interface ModuleDependency {
  id: string;
  refs: ModuleRef[];
}

export interface ModuleVersion {
  version: string;
  dependencies?: ModuleDependency[];
  variables: ModuleVariable[];
  outputs: ModuleOutput[];
}

export interface ModuleVariable {
  name: string;
  type?: string;
  description?: string;
  optional?: boolean;
  defaultValue?: string;
  moduleRef?: ModuleOutputRef;
}

export interface ModuleOutputRef {
  id: string;
  output: string;
}

export interface ModuleOutput {
  name: string;
  description?: string;
}

export interface IStage {
  name: string;
  source: string;
  module: SingleModuleVersion;
  variables: Array<BaseVariable>;
}

export interface Stage extends IStage, StagePrinter {
}
