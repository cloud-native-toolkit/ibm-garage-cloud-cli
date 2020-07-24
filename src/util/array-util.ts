import {Optional} from './optional';

export class ArrayUtil<T = any> {
  private constructor(public readonly value: T[]) {
  }

  static of<T>(array: T[]): ArrayUtil<T> {
    return new ArrayUtil(array);
  }

  filter(f: (value: T) => boolean): ArrayUtil<T> {
    return new ArrayUtil(this.value.filter(f));
  }

  map<U>(f: (value: T) => U): ArrayUtil<U> {
    return new ArrayUtil(this.value.map(f));
  }

  first(): Optional<T> {
    if (!this.value || this.value.length == 0) {
      return Optional.empty();
    }

    return Optional.of(this.value[0]);
  }

  get length(): number {
    return this.value.length;
  }

  asArray(): T[] {
    return this.value;
  }
}

export function first<T>(array: T[]): Optional<T> {
  return ArrayUtil.of(array).first();
}

export function of<T>(array: T[]): ArrayUtil<T> {
  return ArrayUtil.of(array);
}
