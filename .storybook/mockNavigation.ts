/**
 * A `navigation` prop for screens that still take one.
 *
 * Screens reached through a navigator get this injected; in a story we pass it
 * explicitly. Actions are logged so the Storybook Actions panel shows them.
 */
export const mockScreenNavigation = {
  navigate: (...a: unknown[]) => console.log('navigate', ...a),
  goBack: () => console.log('goBack'),
  canGoBack: () => true,
  push: (...a: unknown[]) => console.log('push', ...a),
  pop: () => console.log('pop'),
  popToTop: () => console.log('popToTop'),
  replace: (...a: unknown[]) => console.log('replace', ...a),
  reset: (...a: unknown[]) => console.log('reset', ...a),
  setParams: (...a: unknown[]) => console.log('setParams', ...a),
  setOptions: () => {},
  getParent: () => undefined,
  getState: () => ({ routes: [], index: 0 }),
  addListener: () => () => {},
  removeListener: () => {},
  isFocused: () => true,
  dispatch: (...a: unknown[]) => console.log('dispatch', ...a),
  toggleDrawer: () => console.log('toggleDrawer'),
  openDrawer: () => console.log('openDrawer'),
  closeDrawer: () => console.log('closeDrawer'),
   
} as any;
