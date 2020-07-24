import {Container} from 'typescript-ioc';
import {CatalogLoader} from './catalog-loader.api';
import {CatalogLoaderImpl} from './catalog-loader.impl';

export * from './catalog-loader.api';

Container.bind(CatalogLoader).to(CatalogLoaderImpl);
