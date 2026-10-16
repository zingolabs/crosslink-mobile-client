import { mockScreenNavigation } from './mockNavigation';

/**
 * Builds the `{ navigation, route }` pair that navigator-registered screens
 * expect. `route` is typed loosely because every screen uses a different
 * ParamList; the shape is what React Navigation actually passes.
 */
export function screenProps<P>(name: string, params?: P) {
  return {
    navigation: mockScreenNavigation,
     
    route: { key: `${name}-story`, name, params } as any,
  };
}
