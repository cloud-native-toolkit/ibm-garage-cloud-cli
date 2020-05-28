import {YqWriteOptions} from './yq-write.options';

export abstract class YqWrite {
  abstract async write(options: YqWriteOptions): Promise<any>;
}
