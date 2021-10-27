import {ThrottledFunction} from 'p-throttle';

import {Throttler} from './throttle.api';

type PromiseResolve<ValueType> = ValueType extends PromiseLike<infer ValueType> ? Promise<ValueType> : Promise<ValueType>;

export class NoopThrottle implements Throttler {
  throttle<Argument extends readonly unknown[], ReturnValue>(function_: (...args: Argument) => ReturnValue): ThrottledFunction<Argument, ReturnValue> {
    const result = (...args: Argument): PromiseResolve<ReturnValue> => {
      return Promise.resolve(function_(...args)) as any;
    };

    const throttler: ThrottledFunction<Argument, ReturnValue> = Object.assign(result, {isEnabled: true, abort: () => undefined});

    return throttler;
  }
}
