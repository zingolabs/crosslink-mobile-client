module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['e2e'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@shopify/react-native-skia|@noble/hashes|react-navigation|@react-navigation/.*)/)',
  ],
  moduleNameMapper: {
    // See __mocks__/appTheme.ts
    '^(\\.{1,2}/)+(app/)?theme$': '<rootDir>/__mocks__/appTheme.ts',
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
    '^@shopify/react-native-skia$': '<rootDir>/__mocks__/skiaMock.tsx',
    '^react-native-worklets$': '<rootDir>/__mocks__/workletsMock.js',
    '\\.(ttf|otf|woff2?)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
