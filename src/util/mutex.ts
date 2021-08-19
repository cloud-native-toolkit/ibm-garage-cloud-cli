import * as fs from 'fs-extra';
import {timer} from './timer';
import {File} from './file-util';
import {Logger} from './logger';

export interface ClaimedMutex {
  release(): Promise<void>;
}

export class Mutex {
  constructor(public readonly path: string, public readonly scope: string, private logger: Logger) {}

  async claim(tokens: object): Promise<ClaimedMutex> {
    await fs.mkdirp(this.path);

    const file = new File(`${this.path}/${this.scope}.mutex`);
    const identifier: string = this.buildIdentifier(tokens);

    const logContext = {mutex: file.filename, identifier};

    while (true) {
      let first = true;
      while (true) {
        if (!await file.exists() || await file.contains(identifier)) {
          break;
        }

        if (first) {
          this.logger.debug(`  Mutex exists: ${file.filename}. Waiting...`)
        }
        first = false;
        await timer(10);
      }

      this.logger.debug(`  Claiming mutex...`, logContext);
      await file.write(identifier);

      if (await file.contains(identifier)) {
        this.logger.debug(`  Mutex claimed`, logContext)
        break;
      } else {
        this.logger.debug(`  Unable to claim mutex`, logContext);
      }
    }

    return {
      release: async () => {
        this.logger.debug(`  Releasing mutex...`, logContext);

        return file.delete();
      }
    };
  }

  private buildIdentifier(token: object): string {
    const values = Object.keys(token)
      .sort((a: string, b: string) => a.localeCompare(b))
      .map(key => token[key]);

    return values.join('-');
  }
}

