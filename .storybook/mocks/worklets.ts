export const scheduleOnRN = <A extends unknown[]>(
  fn: (...args: A) => unknown,
  ...args: A
) => fn(...args);
export const runOnJS =
  <A extends unknown[]>(fn: (...args: A) => unknown) =>
  (...args: A) =>
    fn(...args);
export const runOnUI = runOnJS;
