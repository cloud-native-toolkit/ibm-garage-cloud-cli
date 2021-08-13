import * as fs from 'fs-extra';
import {timer} from './timer';
import {File} from './file-util';

export interface ClaimedMutex {
  release(): Promise<void>;
}

export class Mutex {
  constructor(public readonly path: string, public readonly scope: string) {}

  async claim(tokens: object): Promise<ClaimedMutex> {
    await fs.mkdirp(this.path);

    const file = new File(`${this.path}/${this.scope}.mutex`);
    const value = this.buildIdentifier(tokens);

    while (true) {
      while (true) {
        if (!await file.exists()) {
          break;
        }

        await timer(10);
      }

      await file.write(value);

      if (await file.contains(value)) {
        break;
      }
    }

    return {release: async () => file.delete()};
  }

  private buildIdentifier(token: object): string {
    const values = Object.keys(token)
      .sort((a: string, b: string) => a.localeCompare(b))
      .map(key => token[key]);

    return values.join('-');
  }
}

