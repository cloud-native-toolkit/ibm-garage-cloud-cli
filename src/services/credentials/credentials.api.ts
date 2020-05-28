import {Secrets} from './credentials';

export abstract class Credentials {
  async abstract getCredentials(namespace?: string, notifyStatus?: (status: string) => void): Promise<Secrets>;
}
