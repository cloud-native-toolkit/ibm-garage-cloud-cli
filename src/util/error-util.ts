
export function isError(error: any): error is Error {
  return !!error && !!((error as Error).stack) && !!((error as Error).message);
}
