const { inlined } = require('./scripts/build-env.cjs');

const inlineBuildEnv = ({ types: t }) => ({
  name: 'inline-build-env',
  visitor: {
    MemberExpression(path) {
      for (const key of Object.keys(inlined)) {
        if (path.matchesPattern(`process.env.${key}`)) {
          path.replaceWith(t.stringLiteral(inlined[key]));
          return;
        }
      }
    },
  },
});

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    inlineBuildEnv,
    'dynamic-import-node',
    'react-native-worklets/plugin',
  ],
};
