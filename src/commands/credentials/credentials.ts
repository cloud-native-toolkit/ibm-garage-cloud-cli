import * as kubeClient from '../../api/kubectl/client';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {Container, Inject, Provides} from 'typescript-ioc';
import {KubeClient} from '../../api/kubectl/client';

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

export abstract class Credentials {
  async abstract getCredentials(namespace?: string, notifyStatus?: (status: string) => void): Promise<Secrets>;
}

@Provides(Credentials)
export class CredentialsImpl implements Credentials {
  @Inject
  private kubeSecret: KubeSecret;
  @Inject
  private kubeClient: KubeClient;

  async getCredentials(namespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<Secrets> {

    const results: Info[] = await Promise.all(
      this.configMaps(
        [
          'jenkins-config',
          'sonarqube-config',
          'artifactory-config',
          'argocd-config'
        ], namespace)
        .concat(this.secrets(['sonarqube-access', 'artifactory-access'], namespace))
        .concat(
          this.kubeSecret.getData<ComponentCredentials>('jenkins-access', namespace)
            .then<JenkinsCredentials>(c => {
              return Object.assign(
                {},
                c.username ? {JENKINS_USER: c.username} : {},
                c.password ? {JENKINS_PASSWORD: c.password} : {});
            }),
          this.getArgoCdCredentials(namespace),
        )
    );

    return this.group(this.flatten(results));
  }

  configMaps(configMapNames: string[], namespace: string): Array<Promise<Info>> {
    const kubeConfigMap: KubeConfigMap = Container.get(KubeConfigMap);
    return configMapNames
      .map(name => kubeConfigMap
        .getData(name, namespace)
        .catch(err => ({})));
  }

  secrets(secretNames: string[], namespace: string): Array<Promise<Info>> {
    return secretNames
      .map(name => this.kubeSecret
        .getData(name, namespace)
        .catch(err => ({}))
      );
  }

  async getArgoCdCredentials(namespace: string = 'tools'): Promise<ArgoCdCredentials> {
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

  flatten(values: Info[]): FlattenedInfo {
    return (values || []).reduce((result: FlattenedInfo, current: Info) => {
      return Object.assign({}, result, current);
    }, {});
  }

  group(values: FlattenedInfo): Secrets {
    return Object.keys(values)
      .filter(key => key.split('_').length === 2)
      .reduce((secrets: Secrets, compositeKey: string) => {
        const group = compositeKey.toLowerCase().split('_')[0];
        const key = compositeKey.toLowerCase().split('_')[1];

        const groupValues = secrets[group] || {};
        groupValues[key] = values[compositeKey];
        secrets[group] = groupValues;

        return secrets;
      }, {});
  }
}
