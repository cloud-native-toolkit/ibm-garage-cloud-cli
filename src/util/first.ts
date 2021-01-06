
export default function first<T>(val: T[]): T | undefined {
  if (!val || val.length === 0) {
    return;
  }

  return val[0];
}
