/**
 * Web stub for the Rust wallet bridge (`NativeModules.RPCModule`).
 *
 * Every method resolves to '{}' — the shape WalletService.ts JSON.parses. Stories are
 * expected to supply data through the context decorator, never through the wallet service.
 * A call reaching here is logged so an accidental dependency is visible.
 */
const RPCModule = new Proxy(
  {},
  {
    get:
      (_t, prop) =>
      (...args: unknown[]) => {
        console.warn(`[storybook] RPCModule.${String(prop)} called`, args);
        return Promise.resolve('{}');
      },
  },
);

export default RPCModule;
