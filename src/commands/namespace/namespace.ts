import {Inject, Provides} from 'typescript-ioc';

import {KubeConfigMap, KubeSecret, Secret} from '../../api/kubectl';
import {KubeMetadata, ListOptions, QueryString} from '../../api/kubectl/kubernetes-resource-manager';
import {KubeServiceAccount, ServiceAccount} from '../../api/kubectl/service-account';
import {KubeNamespace} from '../../api/kubectl/namespace';
import {KubeRole} from '../../api/kubectl/role';
import {KubeRoleBinding} from '../../api/kubectl/role-binding';
import {KubeTektonTask} from "../../api/kubectl/tekton-task";
import {KubeTektonPipeline} from "../../api/kubectl/tekton-pipeline";

export abstract class Namespace {
  async abstract create(toNamespace: string, fromNamespace: string, notifyStatus?: (status: string) => void): Promise<string>;
}

const noopNotifyStatus: (status: string) => void = () => {};

@Provides(Namespace)
export class NamespaceImpl implements Namespace{
  @Inject
  private namespaces: KubeNamespace;
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

  async create(toNamespace: string, fromNamespace: string = 'tools', notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {
    notifyStatus('Checking for existing namespace: ' + toNamespace);
    if (!(await this.namespaces.exists(toNamespace))) {
      notifyStatus('Creating namespace: ' + toNamespace);
      await this.namespaces.create(toNamespace);
    }

    notifyStatus('Setting up pull secrets');
    await this.setupPullSecrets(toNamespace, fromNamespace);
    notifyStatus('Setting up tls secrets');
    await this.setupTlsSecrets(toNamespace, fromNamespace);

    notifyStatus('Adding pull secrets to serviceAccount');
    await this.setupServiceAccountWithPullSecrets(toNamespace);

    notifyStatus('Copying ConfigMaps');
    await this.copyConfigMaps(toNamespace, fromNamespace);
    notifyStatus('Copying Secrets');
    await this.copySecrets(toNamespace, fromNamespace);
    notifyStatus('Copying Tekton tasks');
    await this.copyTasks(toNamespace, fromNamespace);
    notifyStatus('Copying Tekton pipelines');
    await this.copyPipelines(toNamespace, fromNamespace);

    try {
      notifyStatus('Copying Jenkins credentials');
      await this.copyJenkinsCredentials(fromNamespace, toNamespace);
    } catch (err) {}

    return toNamespace;
  }

  async setupPullSecrets(namespace: string, fromNamespace: string = 'default'): Promise<any> {

    return this.secrets.copyAll(
      this.buildPullSecretListOptions(fromNamespace),
      namespace,
    );
  }

  buildPullSecretListOptions(fromNamespace: string): ListOptions<Secret> {
    const pattern = `${fromNamespace}-(.*icr.*)`;

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

  async setupServiceAccountWithPullSecrets(namespace: string): Promise<any> {
    const serviceAccountName = 'default';
    const serviceAccount: ServiceAccount = await this.serviceAccounts.get(serviceAccountName, namespace);

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
