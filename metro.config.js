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
const reactScanEnabled = process.env.REACT_SCAN === 'true';

const storybookStubs = ['@react-native-community/datetimepicker'];

const resolveRequest = (context, moduleName, platform) => {
  if (storybookEnabled && storybookStubs.includes(moduleName)) {
    return { type: 'empty' };
  }
  if (reactScanEnabled && moduleName.endsWith('/devtools/ReactScan')) {
    return context.resolveRequest(context, `${moduleName}.on`, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    resolveRequest,
  },
};

module.exports = withStorybook(mergeConfig(defaultConfig, config), {
  enabled: storybookEnabled,
});
