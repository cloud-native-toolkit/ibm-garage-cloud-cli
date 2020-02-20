import {QuestionBuilder} from '../../util/question-builder';
import {Container, Inject} from 'typescript-ioc';
import {ConfigMap, KubeConfigMap, KubeSecret, Secret} from '../../api/kubectl';

interface PrepareOptions {
  apiurl?: string;
  clusterName?: string;
  clusterType: string;
  clusterVersion: string;
  ingressSubdomain: string;
  region?: string;
  registryNamespace: string;
  registryUrl: string;
  resourceGroup?: string;
  serverUrl: string;
  tlsSecretName: string;
  apiKey: string;
  registryUser: string;
}

interface IBMCloudConfig {
  APIURL?: string;
  CLUSTER_NAME?: string;
  CLUSTER_TYPE: string;
  CLUSTER_VERSION: string;
  INGRESS_SUBDOMAIN: string;
  REGION?: string;
  REGISTRY_NAMESPACE: string;
  REGISTRY_URL: string;
  RESOURCE_GROUP?: string;
  SERVER_URL: string;
  TLS_SECRET_NAME: string;
}

interface IBMCloudSecret {
  APIKEY: string;
  REGISTRY_USER: string;
}

// iamapikey

export class PrepareCluster {
  @Inject
  kubeConfigMap: KubeConfigMap;
  @Inject
  kubeSecret: KubeSecret;

  async prepare(options: Partial<PrepareOptions>) {
    const configMapData: IBMCloudConfig = await this.collectConfigValues(options);
    const secretData: IBMCloudSecret = await this.collectSecretValues(options);

    const configMap: ConfigMap = {
      metadata: {
        name: 'ibmcloud-config',
        labels: {
          group: 'catalyst-tools',
          app: 'ibmcloud-config',
        }
      },
      data: configMapData,
    };
    await this.kubeConfigMap.createOrUpdate(configMap.metadata.name, {body: configMap})

    const secret: Secret = {
      metadata: {
        name: 'ibmcloud-apikey',
        labels: {
          group: 'catalyst-tools',
          app: 'ibmcloud-config',
        }
      },
      type: 'Opaque',
      stringData: secretData,
    };
    await this.kubeSecret.createOrUpdate(secret.metadata.name, {body: secret});
  }

  async collectConfigValues(options: Partial<PrepareOptions>): Promise<IBMCloudConfig> {
    const questions: QuestionBuilder<IBMCloudConfig> = Container.get(QuestionBuilder);

    return await questions
      .question({
        name: 'APIURL',
        message: 'Provide the api url for the ibmcloud cli',
        default: 'https://cloud.ibm.com',
      }, options.apiurl)
      .question({
        name: 'CLUSTER_NAME',
        message: 'Provide the name of the cluster',
        default: 'mycluster',
      }, options.clusterName)
      .question({
        name: 'CLUSTER_TYPE',
        message: 'Provide the type of cluster',
        choices: [
          {name: 'Kubernetes', value: 'kubernetes'},
          {name: 'OpenShift', value: 'openshift'},
        ],
      }, options.clusterType)
      .question({
        name: 'CLUSTER_VERSION',
        message: 'Provide the cluster version',
      }, options.clusterVersion)
      .question({
        name: 'INGRESS_SUBDOMAIN',
        message: 'Provide the ingress subdomain for the cluster',
      }, options.ingressSubdomain)
      .question({
        name: 'RESOURCE_GROUP',
        message: 'Provide the resource group for IBM Cloud',
      }, options.resourceGroup)
      .question({
        name: 'REGION',
        message: 'Provide the region for IBM Cloud',
      }, options.region)
      .question({
        name: 'REGISTRY_URL',
        message: 'Provide the url for the image registry',
      }, options.registryUrl)
      .question({
        name: 'REGISTRY_NAMESPACE',
        message: 'Provide the namespace for the image registry',
      }, options.registryNamespace)
      .question({
        name: 'SERVER_URL',
        message: 'Provide the api url of the cluster',
      }, options.serverUrl)
      .question({
        name: 'TLS_SECRET_NAME',
        message: 'Provide the secret that contains the tls secret'
      }, options.tlsSecretName)
      .prompt();
  }

  async collectSecretValues(options: Partial<PrepareOptions>): Promise<IBMCloudSecret> {
    const questions: QuestionBuilder<IBMCloudSecret> = Container.get(QuestionBuilder);

    return await questions
      .question({
        name: 'APIKEY',
        message: 'Provide the apikey for the cluster',
      }, options.apiKey)
      .question({
        name: 'REGISTRY_USER',
        message: 'Provide the user name for accessing the registry',
        default: 'iamapikey',
      }, options.registryUser)
      .prompt();
  }
}