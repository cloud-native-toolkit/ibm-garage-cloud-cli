import {empty, of, Optional} from './optional';

export default function first<T>(val: T[]): Optional<T> {
  if (!val || val.length === 0) {
    return empty();
  }

  return of(val[0]);
}
