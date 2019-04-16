import {EnvironmentOptions} from './environment-options';

export class BaseOptions extends EnvironmentOptions {
  imageName: string;
  imageVersion: string;
  debug: boolean;
  quiet: boolean;
}
