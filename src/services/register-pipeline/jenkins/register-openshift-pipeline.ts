import {Inject} from 'typescript-ioc';
import {prompt, QuestionCollection} from 'inquirer';
import * as YAML from 'js-yaml';
import path = require('path');

import {JenkinsMissingError, RegisterPipelineOptions} from '../register-pipeline.api';
import {ChildProcess} from '../../../util/child-process';
import {FsPromises} from '../../../util/file-util';
import * as openshift from '../../../api/openshift';
import {OpenshiftCommands} from '../../../api/openshift';
import {RegisterPipelineType} from './register-pipeline-type';
import {GitParams} from '../../git-secret';
import {Namespace} from '../../namespace';
import {OcpRoute} from '../../../api/kubectl';

interface Prompt {
  shouldUpdate: boolean;
}

interface GitTrigger {
  secret: string;
}

interface BuildTrigger {
  type: 'GitHub' | 'GitLab';
  github?: GitTrigger;
  gitlab?: GitTrigger;
}

export class RegisterOpenshiftPipeline implements RegisterPipelineType {
  @Inject
  private fsPromises: FsPromises;
  @Inject
  private openShift: OpenshiftCommands;
  @Inject
  private childProcess: ChildProcess;
  @Inject
  private namespace: Namespace;
  @Inject
  private route: OcpRoute;

  async setupDefaultOptions(): Promise<Partial<RegisterPipelineOptions>> {
    return {
      templateNamespace: 'tools',
      pipelineNamespace: await this.namespace.getCurrentProject(),
    };
  }

  async registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams, pipelineName: string, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string; webhookUrl?: string }> {

    const host: string = await this.getRouteHost(options.pipelineNamespace, 'jenkins');

    const secret = 'secret101';
    const buildConfig = this.generateBuildConfig(
      pipelineName,
      gitParams.url,
      gitParams.branch,
      options.pipelineNamespace,
      gitParams.type,
      secret,
      {
        app: gitParams.repo,
      }
    );

    const fileName = await this.fsPromises.writeFile(
      path.join(process.cwd(), './pipeline-build-config.yaml'),
      YAML.safeDump(buildConfig)
    );

    await this.createBuildPipeline(buildConfig.metadata.name, fileName, options.pipelineNamespace);

    const webhookUrl = await this.buildWebhookUrl(
      options.serverUrl,
      options.pipelineNamespace,
      buildConfig.metadata.name,
      secret,
      gitParams.type,
    );

    return {
      jenkinsUrl: host ? `https://${host}` : '',
      jobName: gitParams.name,
      webhookUrl,
      jenkinsUser: '',
      jenkinsPassword: ''
    };
  }

  async buildWebhookUrl(serverUrl: string, namespace: string, jobName: string, secret: string, gitType: string) {
    if (!serverUrl) {
      console.log('Skipping webhook since serverUrl is empty');
      return '';
    }

    const type = gitType === 'gitlab' ? 'gitlab' : 'github';

    return `${serverUrl}/apis/build.openshift.io/v1/namespaces/${namespace}/buildconfigs/${jobName}/webhooks/${secret}/${type}`;
  }

  generateBuildConfig(name: string, uri: string, branch: string = 'master', namespace: string, gitType: string = 'github', secret: string, labels: object = {}, jenkinsFile: string = 'Jenkinsfile') {
    return {
      apiVersion: 'v1',
      kind: 'BuildConfig',
      metadata: {
        name: name.toLowerCase(),
        labels,
      },
      spec: {
        triggers: [this.buildGitTrigger(gitType, secret)],
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
              value: 'openshift',
            }, {
              name: 'NAMESPACE',
              value: namespace,
            }, {
              name: 'BRANCH',
              value: branch,
            }]
          }
        }
      }
    };
  }

  buildGitTrigger(gitType: string, secret: string): BuildTrigger {

    if (gitType === 'gitlab') {
      return {
        type: 'GitLab',
        gitlab: {
          secret,
        }
      };
    } else {
      return {
        type: 'GitHub',
        github: {
          secret,
        }
      };
    }
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

    const questions: QuestionCollection<Prompt> = [{
      type: 'confirm',
      name: 'shouldUpdate',
      message: `The build pipeline (${pipelineName}) already exists. Do you want to update it?`,
      default: true
    }];

    const result: Prompt = await prompt(questions);

    return result.shouldUpdate;
  }

  async getRouteHost(namespace: string, name: string): Promise<string> {
    try {
      const hosts: string[] = await this.route.getHosts(namespace, name);

      if (hosts.length > 0) {
        return hosts[0];
      } else {
        throw new Error('Host not found');
      }
    } catch (err) {
      throw new JenkinsMissingError('Jenkins is not available in the namespace: ' + namespace, 'openshift');
    }
  }

  parseRouteOutput(routeText: string): {spec: {host: string}} {
    const route: {spec: {host: string}} = JSON.parse(routeText.replace(new RegExp('^.*?{'), '{'));

    return route;
  }
}
