import {BuildContext, Container, ObjectFactory} from 'typescript-ioc';
import {ThrottleConfig, Throttler} from './throttle.api';
import {PThrottleImpl} from './p-throttle.impl';
import {NoopThrottle} from './noop.impl';

export * from './throttle.api';

const throttleFactory: ObjectFactory = (context: BuildContext) => {
  const config: ThrottleConfig = context.resolve(ThrottleConfig);

  if (config.limit === -1 && config.interval === -1) {
    return new NoopThrottle();
  }

  return new PThrottleImpl(config);
}

const configFactory: ObjectFactory = (context: BuildContext) => {
  return {limit: -1, interval: -1};
}

Container.bind(ThrottleConfig).factory(configFactory);
Container.bind(Throttler).factory(throttleFactory);
