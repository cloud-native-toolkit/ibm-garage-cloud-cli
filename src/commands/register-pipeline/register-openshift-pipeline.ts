import {Inject} from 'typescript-ioc';
import path = require('path');
import {prompt, Questions} from 'inquirer';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {GitParams} from './create-git-secret';
import {ChildProcess} from '../../util/child-process';
import {FsPromises} from '../../util/file-util';
import * as openshift from '../../api/openshift';
import {OpenshiftCommands} from '../../api/openshift';
import {RegisterPipelineType} from './register-pipeline-type';

interface Prompt {
  shouldUpdate: boolean;
}

export class RegisterOpenshiftPipeline implements RegisterPipelineType {
  @Inject
  private fsPromises: FsPromises;
  @Inject
  private openShift: OpenshiftCommands;
  @Inject
  private childProcess: ChildProcess;

  setupDefaultOptions(): Partial<RegisterPipelineOptions> {
    return {
      jenkinsNamespace: 'tools',
      pipelineNamespace: 'dev',
    };
  }

  async registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams): Promise<{jenkinsUrl: string}> {

    try {
      const buildConfig = this.generateBuildConfig(gitParams.name, gitParams.url, gitParams.branch);

      const fileName = await this.fsPromises.writeFile(
        path.join(process.cwd(), './pipeline-build-config.json'),
        JSON.stringify(buildConfig)
      );

      await this.createBuildPipeline(buildConfig.metadata.name, fileName, options.pipelineNamespace);

      const host: string = await this.getRouteHosts(options.jenkinsNamespace || 'tools', 'jenkins');

      return {jenkinsUrl: host ? `https://${host}` : ''};
    } catch (err) {
      console.log('error registering', err);
    }
  }

  generateBuildConfig(name: string, uri: string, branch: string = 'master', jenkinsFile: string = 'Jenkinsfile') {
    return {
      apiVersion: 'v1',
      kind: 'BuildConfig',
      metadata: {
        name
      },
      spec: {
        source: {
          git: {
            uri,
            ref: branch
          }
        },
        strategy: {
          jenkinsPipelineStrategy: {
            jenkinsfilePath: jenkinsFile,
            env: [{
              name: 'CLOUD_NAME',
              value: 'openshift'
            }]
          }
        }
      }
    };
  }

  async createBuildPipeline(pipelineName: string, fileName: string, namespace: string = 'dev') {
    try {
      await this.openShift.create(fileName, namespace);
    } catch (err) {
      if (!err.message.match(/already exists/)) {
        throw err;
      }

      if (await this.shouldUpdateExistingBuildConfig(pipelineName)) {
        await this.openShift.apply(fileName, namespace);
      }
    }

    await this.openShift.startBuild(pipelineName, namespace);
  }

  async shouldUpdateExistingBuildConfig(pipelineName: string): Promise<boolean> {

    const questions: Questions<Prompt> = [{
      type: 'confirm',
      name: 'shouldUpdate',
      message: `The build pipeline (${pipelineName}) already exists. Do you want to update it?`,
      default: true
    }];

    const result: Prompt = await prompt(questions);

    return result.shouldUpdate;
  }

  async getRouteHosts(namespace: string, name: string): Promise<string> {
    const routeText: string = await this.childProcess.spawn(
      'oc',
      ['get', 'route/jenkins', '-n', namespace, '-o', 'json'],
      {
        env: process.env
      },
      false
    );

    const route: {spec: {host: string}} = this.parseRouteOutput(routeText);

    return route.spec.host;
  }

  parseRouteOutput(routeText: string): {spec: {host: string}} {
    const route: {spec: {host: string}} = JSON.parse(routeText.replace(new RegExp('^.*?{'), '{'));

    return route;
  }
}
