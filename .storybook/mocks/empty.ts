// Generic stub for native modules a story must never call.
const handler: ProxyHandler<object> = {
  get: () => () => Promise.resolve(undefined),
};
const stub = new Proxy({}, handler);
export default stub;
