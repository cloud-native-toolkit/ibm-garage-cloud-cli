import {Inject} from 'typescript-ioc';
import {readFile, promises} from 'fs';
import {get, Response} from 'superagent';
import {safeLoad as parseYaml} from 'js-yaml';

import {Catalog, CatalogLoader, CatalogModel} from './catalog-loader.api';
import {LoggerApi} from '../../../logger';

export class CatalogLoaderImpl implements CatalogLoader {
  @Inject
  _logger: LoggerApi;

  get logger(): LoggerApi {
    return this._logger.child('CatalogLoaderImpl');
  }

  async loadCatalog(catalogUrl: string): Promise<Catalog> {
    this.logger.info('Loading catalog from url: ' + catalogUrl);

    const catalogYaml: string = catalogUrl.startsWith('file:/')
      ? await this.loadCatalogFromFile(catalogUrl.replace('file:/', ''))
      : await this.loadCatalogFromUrl(catalogUrl);

    return new Catalog(parseYaml(catalogYaml) as CatalogModel);
  }

  async loadCatalogFromFile(fileName: string): Promise<string> {
    const catalogYaml = await promises.readFile(fileName);

    return catalogYaml.toString();
  }

  async loadCatalogFromUrl(catalogUrl: string): Promise<string> {
    const response: Response = await get(catalogUrl);

    return response.text;
  }
}