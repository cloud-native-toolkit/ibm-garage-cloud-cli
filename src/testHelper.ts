import {BuildContext, ObjectFactory} from 'typescript-ioc';
import Mock = jest.Mock;

export function factoryFromBuilder<T>(builder: (context: BuildContext) => T): ObjectFactory {
  return (context: BuildContext) => builder(context);
}

export function factoryFromValue<T>(value: T): ObjectFactory {
  return () => value;
}

export function setField<T>(obj: T, field: keyof T, mock: Mock): () => void {
  const oldValue = obj[field];
  obj[field] = mock as any;

  return () => {
    obj[field] = oldValue;
  }
}

export function mockField<T>(obj: T, field: keyof T): Mock {
  const mock: Mock = jest.fn();

  obj[field] = mock as any;

  return mock;
}
