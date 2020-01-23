import {GenerateTokenOptions} from './generate-token-options.model';

export abstract class GenerateToken {
  abstract isAvailable(): boolean;
  async abstract generateToken(commandOptions: GenerateTokenOptions, notifyStatus?: (status: string) => void): Promise<string>;
}
