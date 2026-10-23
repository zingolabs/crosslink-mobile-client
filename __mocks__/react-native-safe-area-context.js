export const SafeAreaProvider = ({ children }) => children;
export const SafeAreaView = ({ children }) => children;
export const useSafeAreaInsets = jest.fn(() => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
}));
