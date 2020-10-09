import {Inject} from 'typescript-ioc';
import * as _ from 'lodash';

import {KubeClient} from '../../api/kubectl/client';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {ListOptions, QueryString} from '../../api/kubectl/kubernetes-resource-manager';
import {Credentials} from './credentials.api';

export interface ComponentCredentials {
  user?: string;
  username?: string;
  password?: string;
}

export interface ComponentUrl {
  url?: string;
}

export type ComponentInfo = ComponentCredentials & ComponentUrl

export interface Secrets {
  jenkins?: ComponentInfo;
  argocd?: ComponentInfo;
  sonarqube?: ComponentInfo;
  artifactory?: ComponentInfo;
}

interface JenkinsConfig {
  JENKINS_URL?: string;
}
interface JenkinsCredentials {
  JENKINS_USER?: string;
  JENKINS_PASSWORD?: string;
}
interface SonarqubeConfig {
  SONARQUBE_URL?: string;
}
interface SonarqubeCredentials {
  SONARQUBE_USER?: string;
  SONARQUBE_PASSWORD?: string;
}
interface ArtifactoryConfig {
  ARTIFACTORY_URL?: string;
}
interface ArtifactoryCredentials {
  ARTIFACTORY_USER?: string;
  ARTIFACTORY_PASSWORD?: string;
}
interface ArgoCdConfig {
  ARGOCD_URL?: string;
}
interface ArgoCdCredentials {
  ARGOCD_USER?: string;
  ARGOCD_PASSWORD?: string;
}

type Configs = JenkinsConfig |
  SonarqubeConfig |
  ArtifactoryConfig |
  ArgoCdConfig;

type Creds = JenkinsCredentials |
  SonarqubeCredentials |
  ArtifactoryCredentials |
  ArgoCdCredentials;

type Info = Configs | Creds;

type FlattenedInfo =
  JenkinsConfig &
  JenkinsCredentials &
  SonarqubeConfig &
  SonarqubeCredentials &
  ArtifactoryConfig &
  ArtifactoryCredentials &
  ArgoCdConfig &
  ArgoCdCredentials;

const noopNotifyStatus: (status: string) => void = () => {};

export class CredentialsImpl implements Credentials {
  @Inject
  private kubeSecret: KubeSecret;
  @Inject
  private kubeConfigMap: KubeConfigMap;
  @Inject
  private kubeClient: KubeClient;

  async getCredentials(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Secrets> {

    const qs: QueryString = {labelSelector: 'grouping=garage-cloud-native-toolkit'};
    const listOptions: ListOptions<any> = {namespace, qs};

    const results: Array<Array<object>> = await Promise.all([
      Promise.all([
        this.getArgoCdCredentials(namespace),
        this.getJenkinsCredentials(namespace),
      ]),
      this.kubeSecret.listData(listOptions, ['jenkins-access']),
      this.kubeConfigMap.listData(listOptions, ['ibmcloud-config', 'cloud-config']),
    ]);

    return this.group(_.assign({}, ...(_.flatten(results))));
  }

  async getJenkinsCredentials(namespace: string): Promise<{JENKINS_USER?: string, JENKINS_PASSWORD?: string, JENKINS_APITOKEN?: string}> {

    try {
      const jenkinsAccess: {username: string, password: string, api_token: string} = await this.kubeSecret.getData('jenkins-access', namespace);

      return {
        JENKINS_USER: jenkinsAccess.username,
        JENKINS_PASSWORD: jenkinsAccess.password,
        JENKINS_APITOKEN: jenkinsAccess.api_token,
      };
    } catch (err) {
      return {};
    }
  }

  async getArgoCdCredentials(namespace: string): Promise<ArgoCdCredentials> {
    try {
      const result = await this.kubeClient.api.v1.namespace(namespace).pods.get();

      const ARGOCD_PASSWORD = result.body.items
        .map(item => item.metadata.name)
        .filter(name => name.startsWith('argocd-server'))[0];

      return {ARGOCD_USER: 'admin', ARGOCD_PASSWORD};
    } catch (err) {
      return {};
    }
  }

  group(values: FlattenedInfo): Secrets {
    return Object.keys(values)
      .filter(key => key.split('_').length === 2)
      .reduce((secrets: object, compositeKey: string) => {
        if (compositeKey.split('_').length < 2) {
          return secrets;
        }

        const group = compositeKey.toLowerCase().split('_')[0];
        const key = compositeKey.toLowerCase().split('_')[1];

        const groupValues = secrets[group] || {};
        groupValues[key] = values[compositeKey];
        secrets[group] = groupValues;

        return secrets;
      }, {});
  }
}
