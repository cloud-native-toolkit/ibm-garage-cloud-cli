import * as fs from 'fs-extra';
import {timer} from './timer';

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


class File {
  constructor(public filename: string) {}

  async exists(): Promise<boolean> {
    return fileExists(this.filename);
  }

  async write(contents: string): Promise<void> {
    await fs.writeFile(this.filename, contents);
  }

  async contains(contents: string): Promise<boolean> {
    return fileContains(this.filename, contents);
  }

  async delete(): Promise<void> {
    await fs.remove(this.filename);
  }
}

const fileExists = async (path: string): Promise<boolean> => {
  return await fs.access(path, fs.constants.R_OK).then(() => true).catch(err => false);
}

const fileContains = async (path: string, contents: string): Promise<boolean> => {
  const result = await fs.readFile(path);

  return result.toString() === contents;
}
