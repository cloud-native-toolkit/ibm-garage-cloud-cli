import {Inject} from 'typescript-ioc';
import * as _ from 'lodash';
import {KubeClient} from './client';

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

  async list(options: ListOptions<T> = {}): Promise<Array<T>> {

    const namespace = options.namespace || 'default';

    const getOptions: Query<T> = this.buildQuery(options);

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);
    const result: KubeBody<KubeResourceList<T>> = await kubeResource.get(getOptions);

    const items: T[] = _.get(result, 'body.items', [])
      .filter(options.filter || (() => true))
      .map(options.map || (val => val));

    return items;
  }

  buildQuery(options: ListOptions<T>): Query<T> {
    return {qs: options.qs};
  }

  async createOrUpdate(name: string, body: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    const {processedName, processedBody} = this.processInputs(name, body);

    const result: KubeBody<T> = (await this.exists(processedName, namespace))
      ? await kubeResource(processedName).put(processedBody)
      : await kubeResource.post(processedBody);

    return result.body;
  }

  async create(name: string, body: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    const {processedBody} = this.processInputs(name, body);

    const result: KubeBody<T> = await kubeResource.post(processedBody);

    return result.body;
  }

  async update(name: string, body: KubeBody<T>, namespace: string = 'default'): Promise<T> {

    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    const {processedName, processedBody} = this.processInputs(name, body);

    const result: KubeBody<T> = await kubeResource(processedName).put(processedBody);

    return result.body;
  }

  async exists(name: string, namespace: string = 'default'): Promise<boolean> {
    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    try {
      const result = await kubeResource(name).get();

      if (result) {
        return true;
      }
    } catch (err) {}

    return false;
  }

  async get(name: string, namespace: string = 'default'): Promise<T> {
    const kubeResource = this.resourceNode(this.group, this.version, this.kind, namespace);

    const result = await kubeResource(name).get();

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

  resourceNode(group: string | undefined, version: string, kind: string, namespace: string) {

    const node = !group
      ? this.client.api[version].namespace(namespace)[kind] :
      this.client.apis[group][version].namespace(namespace)[kind];

    return node;
  }

  processInputs(name: string, body: KubeBody<T>): {processedName: string, processedBody: KubeBody<T>} {

    const processedName = name.toLowerCase().replace(new RegExp('_', 'g'), '-');
    const processedBody: KubeBody<T> = {
      body: Object.assign(
        {},
        body.body,
        {
          metadata: Object.assign(
            {},
            body.body.metadata,
            {
              name: processedName,
            } as KubeMetadata
          ),
        },
      ),
    };

    return {
      processedName,
      processedBody,
    };
  }
}
