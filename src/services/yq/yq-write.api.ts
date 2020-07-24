import {YqWriteOptions} from './yq-write.options';

export abstract class YqWrite {
  abstract write(options: YqWriteOptions): Promise<any>;
}
