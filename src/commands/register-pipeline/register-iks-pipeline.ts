import * as path from 'path';
import {Inject} from 'typescript-ioc';
import {Response, get, post} from 'superagent';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {GitParams} from './create-git-secret';
import {JenkinsAccessSecret} from '../../model/jenkins-access-secret.model';
import {KubeSecret} from '../../api/kubectl';
import {RegisterPipelineType} from './register-pipeline-type';
import {FsPromises} from '../../util/file-util';

export class RegisterIksPipeline implements RegisterPipelineType {
  @Inject
  private fs: FsPromises;
  @Inject
  private kubeSecret: KubeSecret;

  setupDefaultOptions(): Partial<RegisterPipelineOptions> {
    return {
      jenkinsNamespace: 'tools',
      pipelineNamespace: 'tools',
    };
  }

  async registerPipeline(options: RegisterPipelineOptions, gitParams: GitParams, credentialsName: string): Promise<{ jenkinsUrl: string; jobName: string; jenkinsUser: string; jenkinsPassword: string; webhookUrl: string }> {

    const jenkinsAccess = await this.pullJenkinsAccessSecrets(options.jenkinsNamespace);

    const jobName = gitParams.branch !== 'master'
      ? `${gitParams.name}_${gitParams.branch}`
      : gitParams.name;

    const headers = options.generateCrumb ? await this.generateJenkinsCrumbHeader(jenkinsAccess) : {};

    try {
      const jobUrl = jenkinsAccess.url;
      // const jobUrl = `{jenkinsAccess.url}/job/${options.pipelineNamespace}`;
      const response: Response = await this.buildJenkinsItem(
        jobUrl,
        jobName,
        jenkinsAccess.username,
        jenkinsAccess.api_token,
        headers,
        await this.buildJenkinsPipelineConfig(gitParams, credentialsName, options.pipelineNamespace),
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Unable to create Jenkins job: ${response.text}`);
      }

      return {
        jenkinsUrl: jenkinsAccess.url,
        jenkinsUser: jenkinsAccess.username,
        jenkinsPassword: jenkinsAccess.api_token,
        jobName,
        webhookUrl: ''
      };
    } catch (err) {
      console.error('Error creating job', err.message);
      throw err;
    }
  }

  async pullJenkinsAccessSecrets(namespace: string = 'tools'): Promise<JenkinsAccessSecret> {

    return await this.kubeSecret.getData<JenkinsAccessSecret>('jenkins-access', namespace);
  }

  async generateJenkinsCrumbHeader(jenkinsAccess: JenkinsAccessSecret): Promise<{'Jenkins-Crumb': string}> {

    console.log(`${jenkinsAccess.username.trim()} via ibm-garage-cloud cli`);

    const response: Response = await
      get(`${jenkinsAccess.url}/crumbIssuer/api/json`)
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

  async buildJenkinsItem(url: string, jobName: string, username: string, apiToken: string, headers: object, content: string): Promise<Response> {
    return post(`${url}/createItem?name=${jobName}`)
        .auth(username, apiToken)
        .set(headers)
        .set('User-Agent', `${username.trim()} via ibm-garage-cloud cli`)
        .set('Content-Type', 'text/xml')
        .send(content);
  }

  async buildJenkinsFolderConfig(): Promise<string> {
    const data: Buffer = await this.fs.readFile(path.join(__dirname, '../../../etc/jenkins-folder-template.xml'));

    return data.toString();
  }

  async buildJenkinsPipelineConfig(gitParams: GitParams, credentialsName: string, namespace: string): Promise<string> {
    const data: Buffer = await this.fs.readFile(path.join(__dirname, '../../../etc/jenkins-pipeline-template.xml'));

    return data.toString()
      .replace(new RegExp('{{NAMESPACE}}', 'g'), namespace)
      .replace(new RegExp('{{GIT_REPO}}', 'g'), gitParams.url)
      .replace(new RegExp('{{GIT_CREDENTIALS}}', 'g'), credentialsName)
      .replace(new RegExp('{{GIT_BRANCH}}', 'g'), gitParams.branch);
  }

  async readFilePromise(filename: string): Promise<Buffer> {
    return this.fs.readFile(filename);
  }
}
