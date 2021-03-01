export function timer(timer: number) {
  return new Promise<void>(resolve => {
    setTimeout(function () {
      resolve();
    }, timer);
  });
}
