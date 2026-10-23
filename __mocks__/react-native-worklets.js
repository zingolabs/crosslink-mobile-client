export const scheduleOnRN = (fn, ...args) => fn(...args);
export const runOnJS =
  fn =>
  (...args) =>
    fn(...args);
export const runOnUI =
  fn =>
  (...args) =>
    fn(...args);
