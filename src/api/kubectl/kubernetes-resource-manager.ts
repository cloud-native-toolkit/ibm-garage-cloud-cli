import * as _ from 'lodash';

import {KindClient, KubeKindBuilder} from './kind-builder';

export type ListOptions<T extends KubeResource> = { namespace?: string } & Query<T>;

export interface KubeResource {
  apiVersion?: string;
  kind?: string;
  metadata: KubeMetadata;
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

export abstract class KubernetesResourceManager<T extends KubeResource> {
  async abstract list(options?: ListOptions<T>): Promise<Array<T>>;

  async abstract createOrUpdate(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  async abstract create(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  async abstract update(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  async abstract exists(name: string, namespace?: string): Promise<boolean>;

  async abstract 'get'(name: string, namespace?: string): Promise<T>;

  async abstract copy(name: string, fromNamespace: string, toNamespace: string): Promise<T>;

  async abstract copyAll(options: ListOptions<T>, toNamespace: string): Promise<Array<T>>;
}

export interface Props {
  group?: string;
  version?: string;
  kind: string;
  name: string;
  client: KubeKindBuilder;
  crd?: boolean;
}

export class AbstractKubernetesResourceManager<T extends KubeResource> implements KubernetesResourceManager<T> {
  public client: KubeKindBuilder;
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
      this.crdPromise = this.client.registerCrdSchema(`${this.name}.${this.group}`);
    } else {
      this.crdPromise = Promise.resolve(true);
    }
  }

  async list(options: ListOptions<T> = {}): Promise<Array<T>> {

    const namespace = options.namespace || 'default';

    const getOptions: Query<T> = this.buildQuery(options);

    const kubeResource: KindClient<T> = await this.resourceNode(this.group, this.version, this.name, namespace);

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

  async createOrUpdate(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource: KindClient<T> = await this.resourceNode(this.group, this.version, this.name, namespace);

    if (kubeResource) {
      const processedName = this.processName(name);

      if (await this.exists(processedName, namespace)) {
        const current: T = await this.get(processedName, namespace);

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

  async create(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource: KindClient<T> = await this.resourceNode(this.group, this.version, this.name, namespace);

    const processedName = this.processName(name);
    const processedBody = this.processInputs(processedName, input.body);

    const result: KubeBody<T> = await kubeResource.post(processedBody);

    return result.body;
  }

  async update(name: string, input: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource: KindClient<T> = await this.resourceNode(this.group, this.version, this.name, namespace);

    const current: T = await this.get(name, namespace);

    const processedName = this.processName(name);
    const processedBody = this.processInputs(processedName, input.body, current);

    const result: KubeBody<T> = await kubeResource(processedName).put(processedBody);

    return result.body;
  }

  async exists(name: string, namespace: string = 'default'): Promise<boolean> {
    const kubeResource = await this.resourceNode(this.group, this.version, this.name, namespace);

    try {
      const result = await kubeResource(name).get();

      if (result) {
        return true;
      }
    } catch (err) {
    }

    return false;
  }

  async 'get'(name: string, namespace: string = 'default'): Promise<T> {
    const kubeResource: KindClient<T> = await this.resourceNode(this.group, this.version, this.name, namespace);

    const result: KubeBody<T> = await kubeResource(name).get();

    return _.get(result, 'body');
  }

  async copy(name: string, fromNamespace: string, toNamespace: string): Promise<T> {
    const result = await this.get(name, fromNamespace);

    return this.createOrUpdate(
      name,
      {
        body: this.updateWithNamespace(result, toNamespace)
      },
      toNamespace,
    );
  }

  async copyAll(options: ListOptions<T>, toNamespace: string): Promise<Array<T>> {
    const results: T[] = await this.list(options);

    return Promise.all((results || []).map(result => {
      return this.createOrUpdate(
        result.metadata.name,
        {
          body: this.updateWithNamespace(result, toNamespace)
        },
        toNamespace,
      );
    }));
  }

  updateWithNamespace(obj: T, namespace: string): T {
    if (!obj) {
      return {} as any;
    }

    const metadata = Object.assign(
      {},
      {
        name: obj.metadata.name,
        labels: obj.metadata.labels,
        annotations: obj.metadata.annotations,
      },
      {
        namespace,
      },
    );

    return Object.assign({}, obj, {metadata});
  }

  async resourceNode<T extends KubeResource>(group: string | undefined, version: string, kind: string, namespace: string): Promise<KindClient<T>> {

    await this.crdPromise;

    return this.client.getResourceNode<T>(group, version, kind, namespace);
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
