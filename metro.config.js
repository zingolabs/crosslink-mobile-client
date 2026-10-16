const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

const storybookStubs = ['@react-native-community/datetimepicker'];

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    ...(storybookEnabled && {
      resolveRequest: (context, moduleName, platform) =>
        storybookStubs.includes(moduleName)
          ? { type: 'empty' }
          : context.resolveRequest(context, moduleName, platform),
    }),
  },
};

module.exports = withStorybook(mergeConfig(defaultConfig, config), {
  enabled: storybookEnabled,
});
