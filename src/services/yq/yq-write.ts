import {Inject} from 'typescript-ioc';
import * as _ from 'lodash';
import {query} from 'jsonpath';
import * as YAML from 'js-yaml';

import {YqWriteOptions} from './yq-write.options';
import {FsPromises} from '../../util/file-util';
import {YqWrite} from './yq-write.api';

export class YqWriteImpl implements YqWrite {
  @Inject
  fs: FsPromises;

  async write(options: YqWriteOptions): Promise<any> {
    const obj = await this.readYamlFile(options.file);

    const updatedObj = this.setValue(obj, options.field, options.value);

    if (options.inplace) {
      await this.writeYamlFile(options.file, updatedObj);
    }

    return updatedObj;
  }

  async readYamlFile<T extends object = object>(filename: string): Promise<T> {
    return this.fs.readFile(filename).then((contents: Buffer) => {
      return YAML.safeLoad(contents.toString()) as T;
    });
  }

  setValue(obj: object, field: string, value: string): object {
    const pos = field.lastIndexOf('.');
    if (pos > -1) {
      const jsonQuery = field.substring(0, pos);
      const leaf = field.substring(pos + 1);

      const childObj = query(obj, jsonQuery);

      if (Array.isArray(childObj)) {
        childObj.forEach(element => {
          _.set(element, leaf, value);
        });
      } else {
        _.set(childObj, leaf, value);
      }
    } else {
      _.set(obj, field, value);
    }

    return obj;
  }

  async writeYamlFile(filename: string, contents: object): Promise<string> {
    const yaml = YAML.safeDump(contents);

    return this.fs.writeFile(filename, yaml);
  }
}
