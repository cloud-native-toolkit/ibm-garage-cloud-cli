import {Options, ThrottledFunction} from 'p-throttle';

export type ThrottleInput<Argument extends readonly unknown[], ReturnValue> = (...args: Argument) => ReturnValue;
export abstract class Throttler {
  abstract throttle<Argument extends readonly unknown[], ReturnValue>(function_: ThrottleInput<Argument, ReturnValue>): ThrottledFunction<Argument, ReturnValue>;
}

export class ThrottleConfig {
  interval: number;
  limit: number;
  strict?: boolean;

  constructor(values: ThrottleConfig) {
    Object.assign(this, values);
  }
}
