import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import svgr from 'vite-plugin-svgr';

const here = path.dirname(fileURLToPath(import.meta.url));
const mock = (p: string) => path.resolve(here, 'mocks', p);

/**
 * Native modules with no react-native-web implementation.
 * Each entry is aliased to a stub in `.storybook/mocks`.
 * Add here whenever a story fails with "undefined is not an object" on a
 * NativeModules lookup.
 */
const nativeModuleAliases = {
  '@notifee/react-native': mock('notifee.ts'),
  '@callstack/liquid-glass': mock('liquid-glass.tsx'),
  'react-native-biometrics': mock('empty.ts'),
  'react-native-keychain': mock('keychain.ts'),
  'react-native-fs': mock('react-native-fs.ts'),
  'react-native-device-info': mock('react-native-device-info.ts'),
  'react-native-localize': mock('react-native-localize.ts'),
  'react-native-vision-camera': mock('vision-camera.tsx'),
  'react-native-context-menu-view': mock('context-menu-view.tsx'),
  '@sayem314/react-native-keep-awake': mock('keep-awake.ts'),
  '@react-native-clipboard/clipboard': mock('clipboard.ts'),
  lifehash: mock('lifehash.ts'),
  '@react-native-community/blur': mock('blur.tsx'),
  'react-native-linear-gradient': mock('linear-gradient.tsx'),
  '@gorhom/bottom-sheet': mock('bottom-sheet.tsx'),
  'react-native-reanimated': mock('reanimated.tsx'),
  'react-native-worklets': mock('worklets.ts'),
};

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx)',
    '../app/**/*.stories.@(ts|tsx)',
    '../prototypes/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // Libraries that ship untranspiled React Native source.
      modulesToTranspile: [
        '@bottom-tabs/react-navigation',
        'react-native-bottom-tabs',
        'react-native-toastier',
        'react-native-bouncy-checkbox',
        'react-native-gifted-charts',
        'lucide-react-native',
      ],
      // NOTE: the react-native-worklets babel plugin is deliberately NOT
      // enabled. Its output targets the native worklets runtime, which does
      // not exist in a browser. `react-native-reanimated` is stubbed instead.
    },
  },
  viteFinal: async cfg => {
    cfg.plugins = cfg.plugins ?? [];
    // The app imports `.svg` as components (metro uses react-native-svg-transformer).
    // svgr with `native: true` emits react-native-svg components, matching that.
    cfg.plugins.push(
      svgr({ include: '**/*.svg', svgrOptions: { native: true } }),
    );

    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = [
      // Regex entries first: they match the relative specifiers the app uses
      // (`../../app/RPCModule`), which a plain string alias would not.
      {
        // The Rust wallet bridge. Stories must never reach a real node.
        // Must match the whole specifier: Vite replaces only the matched
        // substring, so a partial match would corrupt the relative path.
        find: /^(?:.*\/)?app\/RPCModule$/,
        replacement: mock('RPCModule.ts'),
      },
      {
        find: /^@react-native-community\/netinfo(\/.*)?$/,
        replacement: mock('netinfo.ts'),
      },
      ...Object.entries(nativeModuleAliases).map(([find, replacement]) => ({
        find,
        replacement,
      })),
      ...(Array.isArray(cfg.resolve.alias)
        ? cfg.resolve.alias
        : Object.entries(cfg.resolve.alias ?? {}).map(
            ([find, replacement]) => ({
              find,
              replacement: replacement as string,
            }),
          )),
    ];
    return cfg;
  },
};

export default config;
