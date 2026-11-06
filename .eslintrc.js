module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:react-hooks/recommended'],
  plugins: ['@react-native'],
  rules: {
    'react-hooks/exhaustive-deps': 'error',
  },
  overrides: [
    {
      files: ['prototypes/**', '.storybook/**'],
      rules: {
        'react-hooks/immutability': 'off',
        'react-hooks/purity': 'off',
        'react-hooks/refs': 'off',
        'react-hooks/set-state-in-effect': 'off',
      },
    },
    {
      files: ['*.mts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      env: { node: true },
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
      },
    },
  ],
};
