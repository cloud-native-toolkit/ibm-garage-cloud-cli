import {Module} from '../module-selector';

export interface CatalogCategoryModel {
  category: string;
  selection: 'required' | 'single' | 'indirect' | 'multiple';
  modules: Module[];
}

export interface CatalogModel {
  categories: CatalogCategoryModel[];
}

function determineModuleProvider(module: Module) {
  if (module.provider) {
    return module.provider;
  }

  const regex = new RegExp('.*terraform-([^-]+)-.*', 'ig');
  if (regex.test(module.id)) {
    return module.id.replace(regex, "$1");
  }

  return '';
}

export class Catalog implements CatalogModel {
  public readonly categories: CatalogCategoryModel[];
  public readonly filterValue?: {platform: string, provider: string};

  constructor(values: CatalogModel, filterValue?: {platform: string, provider: string}) {
    this.categories = values.categories;
    this.filterValue = filterValue;
  }

  get modules(): Module[] {
    return this.categories.reduce((result: Module[], current: CatalogCategoryModel) => {
      if (current.modules.length > 0) {
        result.push(...current.modules);
      }

      return result;
    }, [])
  }

  filter({platform, provider}: {platform: string, provider: string}): Catalog {
    const filteredCategories: CatalogCategoryModel[] = this.categories
      .map((category: CatalogCategoryModel) => {
        const filteredModules = category.modules
          .filter((m: Module) => !m.platforms || m.platforms.includes(platform))
          .filter((m: Module) => provider === 'ibm' || determineModuleProvider(m) != 'ibm');

        return Object.assign({}, category, {modules: filteredModules});
      })
      .filter((category: CatalogCategoryModel) => (category.modules.length > 0));

    return new Catalog({categories: filteredCategories}, {platform, provider});
  }
}

export abstract class CatalogLoader {
  abstract loadCatalog(catalogUrl: string): Promise<Catalog>;
}
