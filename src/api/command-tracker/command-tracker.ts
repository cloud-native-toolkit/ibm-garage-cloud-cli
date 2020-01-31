import {Provides, Singleton} from 'typescript-ioc';
import {Command} from './command-tracker.model';

export abstract class CommandTracker {
  abstract record(command: Command);
  abstract readonly commands: Command[];
}

@Provides(CommandTracker)
@Singleton
export class CommandTrackerImpl implements CommandTracker {
  private readonly _commands: Command[] = [];

  record(command: Command) {
    this._commands.push(command);
  }

  get commands() {
    return this._commands;
  }
}