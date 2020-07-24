
export class NoSuchElement extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export class Optional<T = any> {
  private constructor(public readonly value?: T) {
  }

  static of<T = any>(value: T): Optional<T> {
    return new Optional(value);
  }

  static empty<T = any>(): Optional<T> {
    return new Optional();
  }

  isPresent(): boolean {
    return this.value !== undefined && this.value !== null;
  }

  ifPresent(f: (value: T) => void) {
    if (this.isPresent()) {
      f(this.value);
    }
  }

  get(): T {
    if (!this.isPresent()) {
      throw new NoSuchElement('The element does not exist');
    }

    return this.value;
  }

  orElse(defaultValue: T): T {
    if (!this.isPresent()) {
      return defaultValue;
    }

    return this.value;
  }

  orElseThrow(err: Error): T {
    if (!this.isPresent()) {
      throw err;
    }

    return this.value;
  }

  map<U>(f: (value: T) => U): Optional<U> {
    if (this.isPresent()) {
      return Optional.of(f(this.value));
    }
  }
}

export function of<T = any>(value: T): Optional<T> {
  return Optional.of(value);
}

export function empty<T = any>(): Optional<T> {
  return Optional.empty();
}
