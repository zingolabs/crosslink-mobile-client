module.exports = {
  root: true,
  extends: ['@react-native'],
  plugins: ['@react-native'],
  overrides: [
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
