import {Inject, Provides} from 'typescript-ioc';

import {KubeConfigMap, KubeSecret, Secret} from '../../api/kubectl';
import {
  AbstractKubernetesResourceManager,
  KubeMetadata,
  ListOptions,
  QueryString
} from '../../api/kubectl/kubernetes-resource-manager';
import {KubeServiceAccount, ServiceAccount} from '../../api/kubectl/service-account';
import {AbstractKubeNamespace, KubeNamespace} from '../../api/kubectl/namespace';
import {KubeRole} from '../../api/kubectl/role';
import {KubeRoleBinding} from '../../api/kubectl/role-binding';
import {KubeTektonTask} from "../../api/kubectl/tekton-task";
import {KubeTektonPipeline} from "../../api/kubectl/tekton-pipeline";
import {ClusterType} from '../../util/cluster-type';
import {OcpProject} from '../../api/kubectl/project';
import {NamespaceOptionsModel} from './namespace-options.model';
import {KubePod, Pod} from '../../api/kubectl/pod';
import {ChildProcess} from '../../util/child-process';

export abstract class Namespace {
  async abstract create(namespaceOptions: NamespaceOptionsModel, notifyStatus?: (status: string) => void): Promise<string>;
}

const noopNotifyStatus: (status: string) => void = () => {};

@Provides(Namespace)
export class NamespaceImpl implements Namespace{
  @Inject
  private namespaces: KubeNamespace;
  @Inject
  private projects: OcpProject;
  @Inject
  private secrets: KubeSecret;
  @Inject
  private configMaps: KubeConfigMap;
  @Inject
  private tektonTasks: KubeTektonTask;
  @Inject
  private tektonPipelines: KubeTektonPipeline;
  @Inject
  private serviceAccounts: KubeServiceAccount;
  @Inject
  private roles: KubeRole;
  @Inject
  private roleBindings: KubeRoleBinding;
  @Inject
  private kubePod: KubePod;
  @Inject
  private clusterType: ClusterType;
  @Inject
  private childProcess: ChildProcess;

  async create({namespace, templateNamespace, serviceAccount, jenkins, tekton}: NamespaceOptionsModel, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {

    const {clusterType, serverUrl} = await this.clusterType.getClusterType(templateNamespace);

    const nsManager: AbstractKubeNamespace<any> = clusterType === 'openshift' ? this.projects : this.namespaces;
    notifyStatus('Checking for existing namespace: ' + namespace);
    if (!(await nsManager.exists(namespace))) {
      notifyStatus('Creating namespace: ' + namespace);
      await nsManager.create(namespace);
    }

    notifyStatus('Setting up pull secrets');
    await this.setupPullSecrets(namespace, templateNamespace);

    notifyStatus(`Adding pull secrets to serviceAccount: ${serviceAccount}`);
    await this.setupServiceAccountWithPullSecrets(namespace, serviceAccount);

    notifyStatus('Copying ConfigMaps');
    await this.copyConfigMaps(namespace, templateNamespace);
    notifyStatus('Copying Secrets');
    await this.copySecrets(namespace, templateNamespace);

    if (tekton) {
      notifyStatus('Copying Tekton tasks');
      await this.copyTasks(namespace, templateNamespace);
      notifyStatus('Copying Tekton pipelines');
      await this.copyPipelines(namespace, templateNamespace);
    }

    if (jenkins) {
      await this.setupJenkins(namespace, templateNamespace, clusterType, notifyStatus);
    }

    return namespace;
  }

  async setupPullSecrets(namespace: string, fromNamespace: string = 'default'): Promise<any> {

    return this.secrets.copyAll(
      this.buildPullSecretListOptions(fromNamespace),
      namespace,
    );
  }

  buildPullSecretListOptions(fromNamespace: string): ListOptions<Secret> {
    const pattern = `${fromNamespace}-(.*icr.*)|(.*icr.*)`;

    const filter: (secret: Secret) => boolean = (secret: Secret) => {
      return new RegExp(pattern, 'g').test(secret.metadata.name);
    };

    const mapMetadata: (metadata: KubeMetadata) => KubeMetadata = (metadata: KubeMetadata) => {
      return Object.assign(
        {},
        metadata,
        {
          name: metadata.name.replace(new RegExp(pattern, 'g'), '$1')
        });
    };

    const map: (secret: Secret) => Secret = (secret: Secret) => {
      return Object.assign(
        {},
        secret,
        {
          metadata: mapMetadata(secret.metadata)
        });
    };

    return {namespace: fromNamespace, filter, map};
  }

  async setupTlsSecrets(namespace: string, fromNamespace: string = 'default'): Promise<any> {

    return this.secrets.copyAll(
      this.buildTlsSecretListOptions(fromNamespace),
      namespace,
    );
  }

  buildTlsSecretListOptions(fromNamespace: string): ListOptions<Secret> {
    const filter: (secret: Secret) => boolean = (secret: Secret) => {
      return !!secret.data
        && !!secret.data['tls.key']
        && !(secret.metadata.name === 'router-certs' || secret.metadata.name === 'router-wildcard-certs');
    };

    return {namespace: fromNamespace, filter};
  }

  async copyConfigMaps(toNamespace: string, fromNamespace: string): Promise<any> {
    if (toNamespace === fromNamespace) {
      return;
    }

    const qs: QueryString = {labelSelector: 'group=catalyst-tools'};

    return this.configMaps.copyAll({namespace: fromNamespace, qs}, toNamespace);
  }

  async copySecrets(toNamespace: string, fromNamespace: string): Promise<any> {
    if (toNamespace === fromNamespace) {
      return;
    }

    const qs: QueryString = {labelSelector: 'group=catalyst-tools'};

    return this.secrets.copyAll({namespace: fromNamespace, qs}, toNamespace);
  }

  async copyTasks(toNamespace: string, fromNamespace: string): Promise<any> {
    if (toNamespace === fromNamespace) {
      return;
    }

    return this.tektonTasks.copyAll({namespace: fromNamespace}, toNamespace);
  }

  async copyPipelines(toNamespace: string, fromNamespace: string): Promise<any> {
    if (toNamespace === fromNamespace) {
      return;
    }

    return this.tektonPipelines.copyAll({namespace: fromNamespace}, toNamespace);
  }

  async setupServiceAccountWithPullSecrets(namespace: string, serviceAccountName: string): Promise<any> {
    let serviceAccount: ServiceAccount = await this.getServiceAccount(namespace, serviceAccountName);

    const pullSecretPattern = '.*icr-io';
    const serviceAccountWithPullSecrets: ServiceAccount = await this.updateServiceAccountWithPullSecretsMatchingPattern(
      serviceAccount,
      pullSecretPattern,
    );

    return this.serviceAccounts.update(
      serviceAccountName,
      {body: serviceAccountWithPullSecrets},
      namespace,
    );
  }

  async getServiceAccount(namespace: string, name: string): Promise<ServiceAccount> {
    if (await this.serviceAccounts.exists(name, namespace)) {
      return this.serviceAccounts.get(name, namespace);
    } else {
      return this.serviceAccounts.create(name, {body: {metadata: {name}}}, namespace);
    }
  }

  containsPullSecretsMatchingPattern(serviceAccount: ServiceAccount, pattern: string): boolean {
    const imagePullSecrets: Array<{name: string}> = serviceAccount.imagePullSecrets || [];

    const regex = new RegExp(pattern, 'g');

    return imagePullSecrets
      .map((imagePullSecret: {name: string}) => imagePullSecret.name)
      .some(name => regex.test(name));
  }

  async updateServiceAccountWithPullSecretsMatchingPattern(serviceAccount: ServiceAccount, pullSecretPattern: string): Promise<ServiceAccount> {

    const pullSecrets: Array<{name: string}> = await this.listMatchingSecrets(pullSecretPattern, serviceAccount.metadata.namespace);

    return Object.assign(
      {},
      serviceAccount,
      {
        imagePullSecrets: pullSecrets.reduce((secrets: Array<{name: string}>, secret: {name: string}) => {
          if (!secrets.includes(secret)) {
            secrets.push(secret);
          }

          return secrets;
        }, (serviceAccount.imagePullSecrets || []).slice())
      }
    );
  }

  async listMatchingSecrets(pullSecretPattern: string, namespace): Promise<Array<{name: string}>> {

    return (await this.secrets
      .list({
        namespace,
      }))
      .filter((secret: Secret) => !!secret.metadata.name.match(pullSecretPattern))
      .map((secret: Secret) => ({name: secret.metadata.name}));
  }

  async setupJenkins(namespace: string, templateNamespace: string, clusterType: string, notifyStatus: (status: string) => void) {
    try {
      if (clusterType === 'openshift') {
        const jenkinsPods: Pod[] = await this.kubePod.list({
          namespace,
          filter: (pod: Pod) => {
            return new RegExp('jenkins-.*').test(pod.metadata.name) &&
              !(new RegExp('jenkins-.*-deploy').test(pod.metadata.name));
          }
        });

        if (jenkinsPods.length === 0) {
          notifyStatus('Installing Jenkins');
          await this.childProcess.exec(`oc new-app jenkins-ephemeral -n ${namespace}`);
        }
      }

      notifyStatus('Copying Jenkins credentials');
      await this.copyJenkinsCredentials(templateNamespace, namespace);
    } catch (err) {
    }

  }

  async copyJenkinsCredentials(fromNamespace: string, toNamespace: string) {
    await this.copyServiceAccount('jenkins', fromNamespace, toNamespace);

    await this.roles.copy('jenkins-schedule-agents', fromNamespace, toNamespace);

    await this.roleBindings.copy('jenkins-schedule-agents', fromNamespace, toNamespace);
  }

  async copyServiceAccount(name: string, fromNamespace: string, toNamespace: string) {
    const serviceAccount: ServiceAccount = await this.serviceAccounts.copy(
      name,
      fromNamespace,
      toNamespace,
    );

    const secretNames: string[] = this.getServiceAccountSecretNames(serviceAccount);

    await Promise.all(secretNames.map(secretName => this.secrets.copy(
      secretName,
      fromNamespace,
      toNamespace,
    )));
  }

  getServiceAccountSecretNames(serviceAccount: ServiceAccount = {} as any): string[] {

    const serviceAccountSecrets: Array<{name: string}> = []
      .concat(...(serviceAccount.secrets || []))
      .concat(...(serviceAccount.imagePullSecrets || []));

    return serviceAccountSecrets
      .map(val => val.name)
      .reduce((result: string[], current: string) => {
        if (!result.includes(current)) {
          result.push(current);
        }

        return result;
      }, [])
  }
}
