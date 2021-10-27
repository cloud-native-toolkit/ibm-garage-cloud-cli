import * as pThrottle from 'p-throttle';
import {ThrottledFunction} from 'p-throttle';

import {ThrottleConfig, Throttler} from './throttle.api';

export class PThrottleImpl implements Throttler {
  private readonly throttler;

  constructor(config: ThrottleConfig) {
    this.throttler = pThrottle(config);
  }

  throttle<Argument extends readonly unknown[], ReturnValue>(function_: (...args: Argument) => ReturnValue): ThrottledFunction<Argument, ReturnValue> {
    return this.throttler(function_);
  }
}
