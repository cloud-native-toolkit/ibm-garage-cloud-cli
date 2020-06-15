import {Container, Inject, Provides} from 'typescript-ioc';

import {JenkinsAuthOptions} from './config-jenkins-auth-options.model';
import {KubeSecret} from '../../api/kubectl';
import {KubeIngress} from '../../api/kubectl/ingress';
import {DefaultBackend, InClusterBackend, KubeBackend} from '../../api/kubectl/client';
import {GenerateToken} from '../generate-token/generate-token.api';
import {GenerateTokenOptions} from '../generate-token/generate-token-options.model';
import {GenerateTokenImpl} from '..';

interface JenkinsSecret {
  'jenkins-admin-password': string;
  'jenkins-admin-user': string;
}

interface GenerateAuthSecret {
  host: string;
  url: string;
  username: string;
  password: string;
  apiToken: string;
  namespace?: string;
}

const noopNotifyStatus: (status: string) => void = () => {};

export abstract class JenkinsAuth {
  abstract isAvailable(): boolean;
  async abstract configJenkinsAuth(options: JenkinsAuthOptions, notifyStatus?: (status: string) => void);
}

@Provides(JenkinsAuth)
export class JenkinsAuthImpl implements JenkinsAuth {
  @Inject
  private kubeSecret: KubeSecret;
  @Inject
  private kubeIngress: KubeIngress;
  @Inject
  private generateToken: GenerateTokenImpl;

  isAvailable(): boolean {
    return true;
  }

  async configJenkinsAuth(options: JenkinsAuthOptions, notifyStatus: (status: string) => void = noopNotifyStatus) {
    if (options.debug) {
      console.log('options: ', options);
    }

    this.configureKubernetesBackend(options);

    const {username, password} = await this.retrieveJenkinsCredentials(options, notifyStatus);

    const {host, url} = await this.retrieveJenkinsUrl(options, notifyStatus);

    const apiToken = await this.retrieveJenkinsApiToken(
      {url, username, password},
      notifyStatus,
    );

    return this.generateJenkinsAuthSecret(
      {host, url, username, password, apiToken, namespace: options.namespace},
      notifyStatus,
    );
  }

  configureKubernetesBackend({inCluster}: {inCluster?: boolean} = {inCluster: false}) {
    if (inCluster) {
      Container.bind(KubeBackend).to(InClusterBackend);
    } else {
      Container.bind(KubeBackend).to(DefaultBackend);
    }
  }

  async retrieveJenkinsCredentials({username, password, namespace = 'tools'}: {username?: string; password?: string; namespace?: string} = {}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<{username: string; password: string}> {

    if (username && password) {
      return {username, password};
    }

    notifyStatus(`Retrieving Jenkins admin password`);

    const jenkinsSecret: JenkinsSecret = await this.kubeSecret.getData('jenkins', namespace);

    return {
      username: jenkinsSecret['jenkins-admin-user'],
      password: jenkinsSecret['jenkins-admin-password']
    };
  }

  async retrieveJenkinsUrl({url, host, namespace = 'tools'}: {url?: string, host?: string, namespace?: string} = {}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<{host: string; url: string}> {
    notifyStatus(`Retrieving Jenkins url`);

    if (!host) {
      host = (await this.kubeIngress.getHosts(namespace, 'jenkins'))[0];
    }

    if (!url) {
      url = (await this.kubeIngress.getUrls(namespace, 'jenkins'))[0];
    }

    return {host, url: url || `http://${host}`};
  }

  async retrieveJenkinsApiToken(options: GenerateTokenOptions & {jenkinsApiToken?: string}, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {

    notifyStatus(`Generating Jenkins api token: ${options.url}`);

    return options.jenkinsApiToken || await (this.generateToken as GenerateToken).generateToken(options, notifyStatus);
  }

  async generateJenkinsAuthSecret({host, url, username, password, apiToken, namespace = 'tools'}: GenerateAuthSecret, notifyStatus: (status: string) => void = noopNotifyStatus) {

    notifyStatus(`Generating jenkins-access secret using apiToken: ${apiToken}`);

    return this.kubeSecret.createOrUpdate(
      'jenkins-access',
      {
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'jenkins-access',
            annotations: {
              description: 'secret providing jenkins credentials, used to interact with Jenkins apis',
            },
          },
          type: 'Opaque',
          stringData: {
            username,
            password,
            api_token: apiToken,
            url,
            host,
          },
        }
      },
      namespace);
  }
}
