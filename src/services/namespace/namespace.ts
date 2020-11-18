import {Inject} from 'typescript-ioc';

import {Namespace} from './namespace.api';
import {NamespaceOptionsModel} from './namespace-options.model';
import {CreateServiceAccount} from '../create-service-account';
import {
  AbstractKubeNamespace,
  KubeConfigMap,
  KubeNamespace,
  KubePod,
  KubeRole,
  KubeRoleBinding,
  KubeSecret,
  KubeServiceAccount,
  KubeTektonPipeline,
  KubeTektonTask,
  OcpProject,
  OcpProjectCli,
  Pod,
  Secret,
  ServiceAccount,
  KubeMetadata,
  ListOptions,
  QueryString, KubeClient, KubeBody, Project
} from '../../api/kubectl';
import {ClusterType} from '../../util/cluster-type';
import {ChildProcess} from '../../util/child-process';

const noopNotifyStatus: (status: string) => void = () => {
};

export class NamespaceImpl implements Namespace {
  @Inject
  private namespaces: KubeNamespace;
  @Inject
  private projects: OcpProjectCli;
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
  @Inject
  private createServiceAccount: CreateServiceAccount;

  async getCurrentProject(defaultValue?: string): Promise<string> {
    const currentContextResult = await this.childProcess.exec('kubectl config view -o jsonpath=\'{.current-context}\'');

    if (currentContextResult.stdout) {
      const currentContext = currentContextResult.stdout.toString()
        .trim()
        .replace(/'/g, '')
        .replace(/"/g, '');

      if (currentContext) {
        const {stdout} = await this.childProcess.exec(`kubectl config view -o jsonpath='{.contexts[?(@.name=="'${currentContext}'")].context.namespace}'`);

        const value = stdout.toString()
          .trim()
          .replace(/'/g, '');

        return value != 'default' ? value : defaultValue;
      }
    }

    return defaultValue;
  }

  async pullSecret({namespace, templateNamespace, serviceAccount}: NamespaceOptionsModel, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {

    notifyStatus('Setting up pull secrets');
    await this.setupPullSecrets(namespace, templateNamespace);

    notifyStatus(`Adding pull secrets to serviceAccount: ${serviceAccount}`);
    await this.setupServiceAccountWithPullSecrets(namespace, serviceAccount);

    return namespace;
  }

  async create({namespace, templateNamespace, serviceAccount, dev}: NamespaceOptionsModel, notifyStatus: (status: string) => void = noopNotifyStatus): Promise<string> {

    const {clusterType, serverUrl} = await this.clusterType.getClusterType(templateNamespace);

    const nsManager: AbstractKubeNamespace<any> = clusterType === 'openshift' ? this.projects : this.namespaces;
    const label = clusterType === 'openshift' ? 'project' : 'namespace';

    notifyStatus(`Checking for existing ${label}: ${namespace}`);
    if (!(await nsManager.exists(namespace))) {
      notifyStatus(`Creating ${label}: ${namespace}`);
      await nsManager.create(namespace);
    }

    if (dev) {
      notifyStatus('Copying ConfigMaps');
      await this.copyConfigMaps(namespace, templateNamespace);
      notifyStatus('Copying Secrets');
      await this.copySecrets(namespace, templateNamespace);
    }

    notifyStatus(`Setting current ${label} to ${namespace}`)
    await this.setCurrentProject(namespace);

    return namespace;
  }

  async setupPullSecrets(namespace: string, fromNamespace: string = 'default'): Promise<any> {

    return this.secrets.copyAll(
      this.buildPullSecretListOptions(fromNamespace),
      namespace,
    );
  }

  buildPullSecretListOptions(fromNamespace: string): ListOptions<Secret> {
    const patterns = [`(${fromNamespace}-.*icr-io)`, '([a-z]{2}-icr-io)', '(icr-io)'];

    const filter: (secret: Secret) => boolean = (secret: Secret) => {
      return any(patterns, pattern => new RegExp(pattern, 'g').test(secret.metadata.name));
    };

    const mapMetadata: (metadata: KubeMetadata) => KubeMetadata = (metadata: KubeMetadata) => {
      const pattern = first(patterns, pattern => new RegExp(pattern, 'g').test(metadata.name));

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
    const imagePullSecrets: Array<{ name: string }> = serviceAccount.imagePullSecrets || [];

    const regex = new RegExp(pattern, 'g');

    return imagePullSecrets
      .map((imagePullSecret: { name: string }) => imagePullSecret.name)
      .some(name => regex.test(name));
  }

  async updateServiceAccountWithPullSecretsMatchingPattern(serviceAccount: ServiceAccount, pullSecretPattern: string): Promise<ServiceAccount> {

    const pullSecrets: Array<{ name: string }> = await this.listMatchingSecrets(pullSecretPattern, serviceAccount.metadata.namespace);

    return Object.assign(
      {},
      serviceAccount,
      {
        imagePullSecrets: pullSecrets.reduce((secrets: Array<{ name: string }>, secret: { name: string }) => {
          if (!secrets.includes(secret)) {
            secrets.push(secret);
          }

          return secrets;
        }, (serviceAccount.imagePullSecrets || []).slice())
      }
    );
  }

  async listMatchingSecrets(pullSecretPattern: string, namespace): Promise<Array<{ name: string }>> {

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
          await this.deployJenkins(notifyStatus, namespace);
        }
      }

      try {
        notifyStatus('Copying Jenkins credentials');
        await this.copyJenkinsCredentials(templateNamespace, namespace);
      } catch (err) {
      }

      if (clusterType === 'openshift') {
        notifyStatus('Adding privileged scc to jenkins serviceAccount');
        await this.createServiceAccount.createOpenShift(namespace, 'jenkins', ['privileged']);
      }
    } catch (err) {
    }

  }

  private async deployJenkins(notifyStatus: (status: string) => void, namespace: string) {
    notifyStatus('Installing Jenkins');
    await this.childProcess.exec(`oc new-app jenkins-ephemeral -n ${namespace}`);
  }

  async copyJenkinsCredentials(fromNamespace: string, toNamespace: string) {
    await this.copyServiceAccount('jenkins', fromNamespace, toNamespace);

    await this.roles.copy('jenkins-schedule-agents', fromNamespace, toNamespace);

    await this.roles.addRules(
      'jenkins-schedule-agents',
      [{
        resource: 'services',
        verbs: ['*'],
      }, {
        apiGroup: 'apps',
        resource: 'deployments',
        verbs: ['*'],
      }, {
        apiGroup: 'networking.k8s.io',
        resource: 'ingresses',
        verbs: ['*'],
      }],
      toNamespace
    );

    await this.roleBindings.copy('jenkins-schedule-agents', fromNamespace, toNamespace);

    await this.roleBindings.addSubject(
      'jenkins-schedule-agents',
      {
        kind: 'ServiceAccount',
        name: 'jenkins',
        namespace: fromNamespace,
      },
      toNamespace)
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

    const serviceAccountSecrets: Array<{ name: string }> = []
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

  async setCurrentProject(namespace: string) {
    await this.childProcess.exec(`kubectl config set-context --current --namespace=${namespace}`);
  }
}

function any(list: string[], test: (value: string) => boolean): boolean {
  return list.filter(test).length > 0;
}

function first(list: string[], test: (value: string) => boolean): string {
  const filteredList = list.filter(test);

  if (filteredList.length == 0) {
    throw new Error('List is empty after applying filter');
  }

  return filteredList[0];
}