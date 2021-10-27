import {ThrottleConfig, Throttler} from './index';
import {Container} from 'typescript-ioc';
import {NoopThrottle} from './noop.impl';
import {PThrottleImpl} from './p-throttle.impl';

describe('throttle', () => {
  describe('noop', () => {
    let throttler: Throttler;
    let config: ThrottleConfig;
    beforeEach(() => {
      config = Container.get(ThrottleConfig);
      throttler = Container.get(Throttler);
    });

    it('config should default as -1', () => {
      expect(config.limit).toEqual(-1);
      expect(config.interval).toEqual(-1);
    });

    it('default config returns Noop', () => {
      expect(throttler instanceof NoopThrottle).toBeTruthy();
    })
  })

  describe('pthrottle', () => {
    let throttler: Throttler;
    let config: ThrottleConfig;
    beforeEach(() => {
      Container.bind(ThrottleConfig).factory((context) => ({limit: 2, interval: 500}));

      config = Container.get(ThrottleConfig);
      throttler = Container.get(Throttler);
    });

    it('config should default as 2, 500', () => {
      expect(config.limit).toEqual(2);
      expect(config.interval).toEqual(500);
    });

    it('default config returns PThrottle', () => {
      expect(throttler instanceof PThrottleImpl).toBeTruthy();
    })
  })
})
