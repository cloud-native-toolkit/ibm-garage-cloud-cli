import * as path from 'path';
import {Inject} from 'typescript-ioc';
import * as superagent from 'superagent';
import {prompt, QuestionCollection} from 'inquirer';

import {RegisterPipelineOptions} from '../register-pipeline.api';
import {RegisterPipelineType} from './register-pipeline-type';
import {GitParams} from '../../git-secret';
import {KubeSecret} from '../../../api/kubectl';
import {JenkinsAccessSecret} from '../../../model/jenkins-access-secret.model';
import {FsPromises} from '../../../util/file-util';

interface Prompt {
  shouldUpdate: boolean;
}

const agent = superagent.agent();

export class RegisterIksPipeline implements RegisterPipelineType {
  @Inject
  private fs: FsPromises;
  @Inject
  private kubeSecret: KubeSecret;

  async setupDefaultOptions(): Promise<Partial<RegisterPipelineOptions>> {
    return {
      templateNamespace: 'tools',
    };
  }

  async registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams, pipelineName: string, credentialsName: string): Promise<{jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string; webhookUrl?: string}> {

    const jenkinsAccess = await this.pullJenkinsAccessSecrets(options.templateNamespace);

    const headers = options.generateCrumb ? await this.generateJenkinsCrumbHeader(jenkinsAccess) : {};

    const folderOptions = Object.assign(
      {},
      jenkinsAccess,
      {
        name: options.pipelineNamespace,
        headers,
      }
    );

    try {
      if (!(await this.ifJenkinsResourceExists(folderOptions))) {
        this.createJenkinsFolder(folderOptions);
      }

      const pipelineOptions = Object.assign(
        {},
        jenkinsAccess,
        {
          name: pipelineName,
          headers,
          url: `${folderOptions.url}/job/${folderOptions.name}`,
          content: await this.buildJenkinsPipelineConfig(gitParams, pipelineName, credentialsName, options.pipelineNamespace),
        }
      );

      if (await this.ifJenkinsResourceExists(pipelineOptions)) {
        const shouldReplace = await this.shouldUpdateExistingBuildConfig(pipelineName);

        if (!shouldReplace) {
          process.exit(0);
        }

        await this.deleteJenkinsPipeline(pipelineOptions);
      }

      await this.createJenkinsPipeline(pipelineOptions);

      await this.startJenkinsPipeline(Object.assign({}, pipelineOptions, {namespace: options.pipelineNamespace}));

      return {
        jenkinsUrl: jenkinsAccess.url,
        jenkinsUser: jenkinsAccess.username,
        jenkinsPassword: jenkinsAccess.api_token,
        jobName: pipelineName,
      };
    } catch (err) {
      console.error('Error creating job', err);
      throw err;
    }
  }

  async ifJenkinsResourceExists({url, name, username, api_token, headers = {}}: {url: string, name: string, username: string, api_token: string, headers: object}): Promise<boolean> {
    try {
      const result: superagent.Response = await agent.get(`${url}/checkJobName?value=${name}`)
        .auth(username, api_token)
        .set(headers)
        .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`);

      if (result.status === 200 && (result.text || '').match('.*job already exists with the name.*')) {
        return true;
      }
    } catch (err) {
      if (err.status === 404) {
        return false;
      }

      throw err;
    }

    return false;
  }

  async createJenkinsFolder({url, name, username, api_token, headers = {}}: {url: string, name: string, username: string, api_token: string, headers: object}) {
    try {
      await agent.post(`${url}/createItem`)
        .query({
          name,
          mode: 'com.cloudbees.hudson.plugins.folder.Folder',
          Submit: 'OK',
        })
        .type('application/x-www-form-urlencoded')
        .auth(username, api_token)
        .set(headers)
        .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`);
    } catch (err) {
      console.log('Error creating folder');
      throw err;
    }
  }

  async pullJenkinsAccessSecrets(namespace: string = 'tools'): Promise<JenkinsAccessSecret> {

    return await this.kubeSecret.getData<JenkinsAccessSecret>('jenkins-access', namespace);
  }

  async generateJenkinsCrumbHeader(jenkinsAccess: JenkinsAccessSecret): Promise<{'Jenkins-Crumb': string}> {

    console.log(`${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`);

    const response: superagent.Response = await
      agent.get(`${jenkinsAccess.url}/crumbIssuer/api/json`)
        .auth(jenkinsAccess.username, jenkinsAccess.api_token)
        .set('User-Agent', `${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Unable to generate Jenkins crumb: ${response.text}`);
    }

    const body: {crumb: string, crumbRequestField: string} = response.body;

    const result = {};
    result[body.crumbRequestField] = body.crumb;

    return result as any;
  }

  async createJenkinsPipeline({url, name, username, api_token, headers, content}: {url: string, name: string, username: string, api_token: string, headers: object, content: string}): Promise<superagent.Response> {
    return agent.post(`${url}/createItem?name=${name}`)
      .auth(username, api_token)
      .set(headers)
      .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`)
      .set('Content-Type', 'text/xml')
      .send(content);
  }

  async deleteJenkinsPipeline({url, name, username, api_token, headers}: {url: string, name: string, username: string, api_token: string, headers: object}): Promise<superagent.Response> {
    return agent.post(`${url}/job/${name}/doDelete`)
      .auth(username, api_token)
      .set(headers)
      .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`);
  }

  async buildJenkinsFolderConfig(): Promise<string> {
    const data: Buffer = await this.fs.readFile(path.join(__dirname, '../../../etc/jenkins-folder-template.xml'));

    return data.toString();
  }

  async buildJenkinsPipelineConfig(gitParams: GitParams, pipelineName: string, credentialsName: string, namespace: string): Promise<string> {
    const data: Buffer = await this.fs.readFile(path.join(__dirname, '../../../etc/jenkins-pipeline-template.xml'));

    return data.toString()
      .replace(new RegExp('{{NAMESPACE}}', 'g'), namespace)
      .replace(new RegExp('{{GIT_REPO}}', 'g'), gitParams.url)
      .replace(new RegExp('{{GIT_CREDENTIALS}}', 'g'), credentialsName)
      .replace(new RegExp('{{GIT_BRANCH}}', 'g'), gitParams.branch);
  }

  async shouldUpdateExistingBuildConfig(pipelineName: string): Promise<boolean> {

    const questions: QuestionCollection<Prompt> = [{
      type: 'confirm',
      name: 'shouldUpdate',
      message: `The build pipeline (${pipelineName}) already exists. Do you want to replace it?`,
      default: true
    }];

    const result: Prompt = await prompt(questions);

    return result.shouldUpdate;
  }

  async startJenkinsPipeline({url, name, username, api_token, namespace, headers = {}}: {url: string, name: string, username: string, api_token: string, namespace: string, headers: object}) {
    // curl -X POST http://developer:developer@localhost:8080/job/test/buildWithParameter
    // --data-urlencode json='{"parameter": [{"name":"paramA", "value":"123"}]}'
    return agent.post(`${url}/job/${name}/buildWithParameters`)
      .query({
        NAMESPACE: namespace,
      })
      .auth(username, api_token)
      .set(headers)
      .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`);
  }

  async readFilePromise(filename: string): Promise<Buffer> {
    return this.fs.readFile(filename);
  }
}
