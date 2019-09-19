import {Provider} from 'typescript-ioc';
import Mock = jest.Mock;

export function providerFromBuilder<T>(builder: () => T): Provider {
  return {
    get: () => builder()
  };
}

export function providerFromValue<T>(value: T): Provider {
  return {
    get: () => value
  };
}

export function mockField<T>(obj: T, field: keyof T, mock: Mock): () => void {
  const oldValue = obj[field];
  obj[field] = mock as any;

  return () => {
    obj[field] = oldValue;
  }
}
