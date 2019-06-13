import * as path from 'path';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {deployImage, DeployOptions} from '../deploy-image';
import {execFile} from "child_process";
import {BUILD_OPTION_ENV_PROPERTIES, extractEnvironmentProperties} from '../../util/env-support';

export async function registerPipeline(options: RegisterPipelineOptions) {

    const valuesFile = path.join(__dirname, '../../../tmp/register-pipeline-values.yaml');

    await execFile.__promisify__(
      path.join(__dirname, '../../../bin/generate-git-values.sh'),
      [valuesFile],
      {},
    );

    const chartRoot = path.join(__dirname, '../../../chart');
    const chartName = 'register-pipeline';

    const deployOptions: DeployOptions = {
        apiKey: options.apiKey,
        cluster: options.cluster,
        resourceGroup: options.resourceGroup,
        region: options.region,
        namespace: options.clusterNamespace,

        chartRoot,
        chartName,
        valuesFile,
    };

    await deployImage(deployOptions);
}
