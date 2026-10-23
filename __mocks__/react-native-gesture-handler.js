export const GestureHandlerRootView = ({ children }) => children;
export const GestureDetector = ({ children }) => children;

const chain = new Proxy({}, { get: () => () => chain });
export const Gesture = new Proxy({}, { get: () => () => chain });

export default {
  Swipeable: jest.fn().mockImplementation(({ children }) => children),
  RNGestureHandlerModule: {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    forceTouchAvailable: jest.fn(),
    hasGenericPassword: jest.fn(),
    getSupportedBiometryType: jest.fn(),
    State: {},
    Directions: {},
  },
};
