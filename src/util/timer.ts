export function timer(timer: number) {
  return new Promise(resolve => {
    setTimeout(function () {
      resolve();
    }, timer);
  });
}
