import {Inject} from 'typescript-ioc';
import * as _ from 'lodash';
import {KubeClient} from './client';

export type ListOptions = { namespace?: string } & Query;

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

export interface Query {
  qs?: QueryString;
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
  async abstract list(options?: ListOptions): Promise<Array<T>>;

  async abstract create(name: string, body: KubeBody<T>, namespace?: string): Promise<T>;

  async abstract 'get'(name: string, namespace?: string): Promise<T>;

  async abstract copy(name: string, fromNamespace: string, toNamespace: string): Promise<T>;

  async abstract copyAll(options: ListOptions, toNamespace: string): Promise<Array<T>>;
}

export interface Props {
  group?: string;
  version?: string;
  kind: string;
  client: KubeClient;
}

export class AbstractKubernetesResourceManager<T extends KubeResource> implements KubernetesResourceManager<T> {
  public client: KubeClient;
  public group?: string;
  version: string;
  kind: string;

  constructor(props: Props) {
    this.client = props.client;
    this.group = props.group;
    this.version = props.version || 'v1';
    this.kind = props.kind;

    if (!this.kind) {
      throw new Error('kind must be defined');
    }
  }

  async list(options: ListOptions = {}): Promise<Array<T>> {

    const namespace = options.namespace || 'default';

    const getOptions: Query = this.buildQuery(options);

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);
    const result: KubeBody<KubeResourceList<T>> = await kubeResource.get(getOptions);

    const items: T[] = _.get(result, 'body.items', []);

    return items;
  }

  buildQuery(options: ListOptions): Query {
    return {qs: options.qs};
  }

  async create(name: string, body: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);
    try {
      await kubeResource(name).get();

      const result: KubeBody<T> = await kubeResource(name).put(body);

      return result.body;
    } catch (err) {
      const result = await kubeResource.post(body);

      return result.body;
    }
  }

  async get(name: string, namespace: string = 'default'): Promise<T> {
    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    const result = await kubeResource(name).get();

    return _.get(result, 'body');
  }

  async copy(name: string, fromNamespace: string, toNamespace: string): Promise<T> {
    const result = await this.get(name, fromNamespace);

    return this.create(
      name,
      {
        body: this.updateWithNamespace(result, toNamespace)
      },
      toNamespace,
    );
  }

  async copyAll(options: ListOptions, toNamespace: string): Promise<Array<T>> {
    const results: T[] = await this.list(options);

    return Promise.all((results || []).map(result => {
      return this.create(
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

  resourceNode(group: string | undefined, version: string, kind: string, namespace: string) {

    const node = !group
      ? this.client.api[version].namespace(namespace)[kind] :
      this.client.apis[group][version].namespace(namespace)[kind];

    return node;
  }
}
