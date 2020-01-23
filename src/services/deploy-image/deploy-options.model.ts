import {BaseOptions} from '../../model';

export class DeployOptions extends BaseOptions {
  cluster: string;
  chartRoot: string;
  chartName?: string;
  namespace: string;
  valuesFile?: string;
}
