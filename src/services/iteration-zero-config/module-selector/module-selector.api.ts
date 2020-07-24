import {Stage} from './module-selector.model';
import {CatalogModel} from '../catalog-loader';
import {IBaseVariable} from '../variables.model';
import {InputModel} from '../iteration-zero-config.model';

export interface TerraformVariable extends IBaseVariable {
  asString(): string;
}

export abstract class ModuleSelector {
  abstract selectStagesAndProvideVariables(fullCatalog: CatalogModel, options: {ci?: boolean, clusterType?: string}, input?: InputModel): Promise<{ stages: { [name: string]: Stage }, variables: TerraformVariable[] }>;
}
