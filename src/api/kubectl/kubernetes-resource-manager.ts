import * as _ from 'lodash';
import {AsyncKubeClient, KubeClient} from './client';
import {ThrottleInput, Throttler} from '../../util/throttle';
import {Container} from 'typescript-ioc';
import {ThrottledFunction} from 'p-throttle';
import {searchAndRemove} from '../../util/searchandremove';

export type ListOptions<T extends KubeResource> = { namespace?: string } & Query<T>;

export interface KubeResource<M = KubeMetadata> {
  apiVersion?: string;
  kind?: string;
  metadata: M;
}

export interface KubeResourceList<T extends KubeResource> {
  apiVersion: string;
  kind: string;
  metadata: KubeMetadata;
  items: T[];
}

export interface KubeMetadata {
  name: string;
  namespace?: string;
  labels?: {[name: string]: string};
  annotations?: {[name: string]: string};
  uid?: string;
  selfLink?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
}

export interface TemplateKubeMetadata {
  generateName: string;
  namespace?: string;
  labels?: any;
  annotations?: any;
  uid?: string;
  selfLink?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
}

export interface KubeBody<T> {
  body: T;
}

export interface Query<T extends KubeResource> {
  qs?: QueryString;
  filter?: (obj: T) => boolean;
  map?: (obj: T) => T;
}

export interface QueryString {
  continue?: any;
  fieldSelector?: string;
  labelSelector?: string;
  limit?: number;
  resourceVersion?: string;
  timeoutSeconds?: number;
  watch?: boolean;
  includeUninitialized?: boolean;
  pretty?: boolean;
}

export abstract class KubernetesClusterResource<T extends KubeResource> {
  abstract list(options?: ListOptions<T>): Promise<Array<T>>;

  abstract createOrUpdate(name: string, body: KubeBody<T>): Promise<T>;

  abstract create(name: string, body: KubeBody<T>): Promise<T>;

  abstract update(name: string, body: KubeBody<T>): Promise<T>;

  abstract exists(name: string): Promise<boolean>;

  abstract 'get'(name: string): Promise<T>;
}

export abstract class KubernetesNamespacedResource<T extends KubeResource> {
  abstract list(options?: ListOptions<T>): Promise<Array<T>>;

  abstract createOrUpdate(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  abstract create(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  abstract update(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  abstract exists(name: string, namespace?: string): Promise<boolean>;

  abstract 'get'(name: string, namespace?: string): Promise<T>;

  abstract copy(name: string, fromNamespace: string, toNamespace: string): Promise<T>;

  abstract copyAll(options: ListOptions<T>, toNamespace: string): Promise<Array<T>>;
}

export interface Props {
  group?: string;
  version?: string;
  kind: string;
  name: string;
  client: AsyncKubeClient;
  crd?: boolean;
}

interface CustomResourceDefinition extends KubeResource {
  spec: object;
  status?: object;
}

async function getCrd(client: KubeClient, name: string): Promise<KubeBody<CustomResourceDefinition>> {
  try {
    const scope = client.apis['apiextensions.k8s.io']['v1beta1'].customresourcedefinitions(name);

    return await throttle<KubeBody<CustomResourceDefinition>[], KubeBody<CustomResourceDefinition>>(scope.get.bind(scope))();
  } catch (error) {
    const scope = client.apis['apiextensions.k8s.io']['v1'].customresourcedefinitions(name);

    return await throttle<KubeBody<CustomResourceDefinition>[], KubeBody<CustomResourceDefinition>>(scope.get.bind(scope))();
  }
}

async function registerCrdSchema(wrappedClient: AsyncKubeClient, name: string): Promise<boolean> {
  try {
    const client: KubeClient = await wrappedClient.get();

    const crd: KubeBody<CustomResourceDefinition> = await getCrd(client, name);

    if (!crd || !crd.body) {
      console.log(`crd not found: ${name}`);
      return false;
    }

    client.addCustomResourceDefinition({
      metadata: {
        annotations: crd.body.metadata.annotations,
        name: crd.body.metadata.name
      },
      spec: crd.body.spec
    });

    return true;
  } catch (err) {
    console.error('Error registering crd: ' + name);
    return false;
  }
}


export class AbstractKubernetesClusterResource<T extends KubeResource> implements KubernetesClusterResource<T> {
  public client: AsyncKubeClient;
  public group?: string;
  version: string;
  name: string;
  kind: string;
  crdPromise: Promise<boolean>;

  constructor(props: Props) {
    this.client = props.client;
    this.group = props.group;
    this.version = props.version || 'v1';
    this.name = props.name;
    this.kind = props.kind;

    if (!this.name || !this.kind) {
      throw new Error('kind must be defined');
    }

    if (props.crd) {
      this.crdPromise = registerCrdSchema(this.client, `${this.name}.${this.group}`);
    } else {
      this.crdPromise = Promise.resolve(true);
    }
  }

  async list(options: ListOptions<T> = {}): Promise<Array<T>> {

    const getOptions: Query<T> = this.buildQuery(options);

    const kubeResource: any = await this.resourceNode(this.group, this.version, this.name);

    if (kubeResource) {
      const result: KubeBody<KubeResourceList<T>> = await kubeResource.get(getOptions);

      const items: T[] = _.get(result, 'body.items', [])
        .filter(options.filter || (() => true))
        .map(options.map || (val => val));

      return items;
    } else {
      return [];
    }
  }

  buildQuery(options: ListOptions<T>): Query<T> {
    return {qs: options.qs};
  }

  async createOrUpdate(name: string, input: KubeBody<T>): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name);

    if (kubeResource) {
      const processedName = this.processName(name);

      if (await this.exists(processedName)) {
        const current: T = await this.get(processedName);

        const processedBody = this.processInputs(processedName, input.body, current);

        return kubeResource(processedName).put(processedBody).then(result => result.body);
      } else {
        const processedBody = this.processInputs(processedName, input.body);

        return kubeResource.post(processedBody).then(result => result.body);
      }
    } else {
      return {} as any;
    }
  }

  async create(name: string, input: KubeBody<T>): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name);

    const processedName = this.processName(name);
    const processedBody = this.processInputs(processedName, input.body);

    const result: KubeBody<T> = await kubeResource.post(processedBody);

    return result.body;
  }

  async update(name: string, input: KubeBody<T>): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name);

    const current: T = await this.get(name);

    const processedName = this.processName(name);
    const processedBody = this.processInputs(processedName, input.body, current);

    const result: KubeBody<T> = await kubeResource(processedName).put(processedBody);

    return result.body;
  }

  async exists(name: string): Promise<boolean> {
    const kubeResource = await this.resourceNode(this.group, this.version, this.name);

    try {
      const result = await kubeResource(name).get();

      if (result) {
        return true;
      }
    } catch (err) {
    }

    return false;
  }

  async get(name: string): Promise<T> {
    const kubeResource = await this.resourceNode(this.group, this.version, this.name);

    const result = await kubeResource(name).get();

    return _.get(result, 'body');
  }

  async getLabel(name: string, labelName: string): Promise<string> {
    const resource = await this.get(name);

    const labels: string[] = Object.keys(resource.metadata.labels || {})
      .filter(name => name === labelName)
      .map(name => resource.metadata.labels[name]);

    return labels.length > 0 ? labels[0] : undefined;
  }

  async resourceNode(group: string | undefined, version: string, kind: string) {

    await this.crdPromise;

    const versionPath: string[] = !group
      ? ['api', version]
      : ['apis', group, version];

    const client: KubeClient = await this.client.get();

    const versionNode = _.get(client, versionPath);

    if (versionNode) {
      return _.get(versionNode, kind);
    }
  }

  processName(name: string): string {
    return name.toLowerCase().replace(new RegExp('_', 'g'), '-');
  }

  processInputs(name: string, input: T, current?: T): KubeBody<T> {

    const processedBody: KubeBody<T> = {
      body: Object.assign(
        {
          kind: this.kind,
          apiVersion: this.group ? `${this.group}/${this.version}` : this.version,
        },
        current,
        input,
        {
          metadata: Object.assign(
            {},
            input.metadata,
            {
              name,
            } as KubeMetadata,
            current
              ? {resourceVersion: current.metadata.resourceVersion} as KubeMetadata
              : {},
          ),
        },
      ),
    };

    return processedBody;
  }
}

let _throttler: Throttler;
const throttle = <Argument extends readonly unknown[], ReturnValue>(function_: ThrottleInput<Argument, ReturnValue>): ThrottledFunction<Argument, ReturnValue> => {
 if (!_throttler) {
   _throttler = Container.get(Throttler);
 }

 return _throttler.throttle(function_);
}

export class AbstractKubernetesNamespacedResource<T extends KubeResource> implements KubernetesNamespacedResource<T> {
  public client: AsyncKubeClient;
  public group?: string;
  version: string;
  name: string;
  kind: string;
  crdPromise: Promise<boolean>;

  constructor(props: Props) {
    this.client = props.client;
    this.group = props.group;
    this.version = props.version || 'v1';
    this.name = props.name;
    this.kind = props.kind;

    if (!this.name || !this.kind) {
      throw new Error('kind must be defined');
    }

    if (props.crd) {
      this.crdPromise = registerCrdSchema(this.client, `${this.name}.${this.group}`);
    } else {
      this.crdPromise = Promise.resolve(true);
    }
  }

  async list(options: ListOptions<T> = {}): Promise<Array<T>> {

    const namespace = options.namespace || 'default';

    const getOptions: Query<T> = this.buildQuery(options);

    const kubeResource: any = await this.resourceNode(this.group, this.version, this.name, namespace);

    if (kubeResource) {
      const result: KubeBody<KubeResourceList<T>> = await throttle<Query<T>[], KubeBody<KubeResourceList<T>>>(kubeResource.get.bind(kubeResource))(getOptions);

      const items: T[] = _.get(result, 'body.items', [])
          .filter(options.filter || (() => true))
          .map(options.map || (val => val));

      return items;
    } else {
      return [];
    }
  }

  buildQuery(options: ListOptions<T>): Query<T> {
    return {qs: options.qs};
  }

  async createOrUpdate(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);
    if (kubeResource) {
      const processedName = this.processName(name);
      if (await this.exists(processedName, namespace)) {
        const current: T = await this.get(processedName, namespace);
        
        const processedBody: KubeBody<T> = this.processInputs(processedName, input.body, current);
        const scope = kubeResource(processedName);
        return throttle<KubeBody<T>[], KubeBody<T>>(scope.put.bind(scope))(processedBody).then(result => result.body);
      } else {
        const processedBody = this.processInputs(processedName, input.body);
        return throttle<KubeBody<T>[], KubeBody<T>>(kubeResource.post.bind(kubeResource))(processedBody).then(result => result.body);
      }
    } else {
      return {} as any;
    }
  }

  async create(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);

    const processedName = this.processName(name);
    const processedBody: KubeBody<T> = this.processInputs(processedName, input.body);

    const result: KubeBody<T> = await throttle<KubeBody<T>[], KubeBody<T>>(kubeResource.post.bind(kubeResource))(processedBody);

    return result.body;
  }

  async update(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);

    const current: T = await this.get(name, namespace);

    const processedName = this.processName(name);
    const processedBody: KubeBody<T> = this.processInputs(processedName, input.body, current);

    const scope = kubeResource(processedName);
    const result: KubeBody<T> = await throttle<KubeBody<T>[], KubeBody<T>>(scope.put.bind(scope))(processedBody);

    return result.body;
  }

  async exists(name: string, namespace: string = 'default'): Promise<boolean> {
    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);

    try {
      const scope = kubeResource(name);
      const result: KubeBody<T> = await throttle<KubeBody<T>[], KubeBody<T>>(scope.get.bind(scope))();

      if (result) {
        return true;
      }
    } catch (err) {
    }

    return false;
  }

  async get(name: string, namespace: string = 'default'): Promise<T> {
    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);

    const scope = kubeResource(name);
    const result = await throttle<KubeBody<T>[], KubeBody<T>>(scope.get.bind(scope))();

    return _.get(result, 'body');
  }

  async getLabel(name: string, labelName: string, namespace: string = 'default'): Promise<string> {
    const resource = await this.get(name, namespace);

    const labels: string[] = Object.keys(resource.metadata.labels || {})
      .filter(name => name === labelName)
      .map(name => resource.metadata.labels[name]);

    return labels.length > 0 ? labels[0] : undefined;
  }

  async copy(name: string, fromNamespace: string, toNamespace: string, toName?: string, updater: (val: T) => T = (val: T) => val): Promise<T> {
    const result = await this.get(name, fromNamespace);

    const newName = (toName || name).replace(/[.]/g, '-');

    return this.createOrUpdate(
      newName,
      {
        body: updater(this.updateWithNamespace(result, toNamespace, newName))
      },
      toNamespace,
    );
  }

  async copyAll(options: ListOptions<T>, toNamespace: string): Promise<Array<T>> {
    const results: T[] = await this.list(options);
    
    return Promise.all((results || []).map(result =>  {
      var deletelabel: string = "";
    return Object.assign(
      {},//target
      result,
      {
        metadata: searchAndRemove(result.metadata,deletelabel)

       
      },
    )}).map(result => {
      return this.createOrUpdate(
        result.metadata.name,
        {
          body : this.updateWithNamespace(result, toNamespace),
          
        },
        toNamespace,
        
      );
      
    },  ));
    
  }

  updateWithNamespace (obj: T  , namespace: string, toName?: string): T {
    if (!obj) {
      return {} as any;
    }

    const metadata = Object.assign(
      {},
      {
        name: toName || obj.metadata.name,
        labels: obj.metadata.labels,
        annotations: obj.metadata.annotations,
      },
      {
        namespace,
      },
    );

    return Object.assign({}, obj, {metadata});
  }

  async resourceNode(group: string | undefined, version: string, kind: string, namespace: string) {

    await this.crdPromise;

    const versionPath: string[] = !group
      ? ['api', version]
      : ['apis', group, version];

    const client: KubeClient = await this.client.get();

    const versionNode = _.get(client, versionPath);

    if (versionNode) {
      return _.get(versionNode.namespace(namespace), kind);
    }
  }

  processName(name: string): string {
    return name.toLowerCase().replace(new RegExp('_', 'g'), '-');
  }

  processInputs(name: string, input: T, current?: T): KubeBody<T> {

    const processedBody: KubeBody<T> = {
      body: Object.assign(
        {
          kind: this.kind,
          apiVersion: this.group ? `${this.group}/${this.version}` : this.version,
        },
        current,
        input,
        {
          metadata: Object.assign(
            {},
            input.metadata,
            {
              name,
            } as KubeMetadata,
            current
              ? {resourceVersion: current.metadata.resourceVersion} as KubeMetadata
              : {},
          ),
        },
      ),
    };

    return processedBody;
  }
}
