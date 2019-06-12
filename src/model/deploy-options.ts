import {BaseOptions} from './base-options';

export class DeployOptions extends BaseOptions {
  cluster: string;
  chartRoot: string;
  chartName?: string;
  environmentName: string;
}
