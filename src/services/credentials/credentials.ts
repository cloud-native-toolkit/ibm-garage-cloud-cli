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
  [tool: string]: ComponentInfo;
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

    const resultArrays: Array<Array<object>> = await Promise.all([
      this.kubeSecret.listData<object>(listOptions, ['jenkins-access']),
      this.kubeConfigMap.listData<object>(listOptions, ['ibmcloud-config', 'cloud-config']),
    ]);

    const results: Array<object> = _.flatten(resultArrays);

    return processResults(results);
  }
}

export const processResults = (results: Array<object>): Secrets => {
  const val: Secrets = results.reduce<Secrets>((result: Secrets, current: object) => {

    const secret: Secrets = Object
      .keys(current)
      .filter((key: string) => key.includes('_'))
      .reduce<Secrets>((previous: Secrets, currentKey: string) => {

        const pos: number = currentKey.lastIndexOf('_');

        const tool: string = currentKey.substring(0, pos).toLowerCase();
        const key: string = currentKey.substring(pos + 1).toLowerCase();
        const value: string = current[currentKey];

        const currentTool = previous[tool] || {};

        currentTool[key] = value;

        previous[tool] = currentTool;

        return previous;
      }, {})

    return _.merge(result, secret);
  }, {} as Secrets)

  return val;
}
