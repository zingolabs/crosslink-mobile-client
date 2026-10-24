import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  LoadedAppStackParamList,
  LoadingAppNavigationState,
} from '../../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ChainNameEnum, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faServer } from '@fortawesome/free-solid-svg-icons';
import FadeText from '../../Components/FadeText';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radiusCard, space, text, useTheme } from '../../../app/theme';
import { LoadingAppEntryEnum } from '../../../app/AppState';

type SettingsServersProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.SettingsServers
> & {
  navigateToLoadingApp: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsServers: React.FunctionComponent<SettingsServersProps> = ({
  navigateToLoadingApp,
  navigation,
}) => {
  const { removeFirstSnackbar } = useAppLoadedActions();
  const { indexerServer } = useAppLoadedSettings();
  const { info } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsServers;

  const changeServer = () => {
    navigateToLoadingApp({
      entry: LoadingAppEntryEnum.menu,
      startingApp: false,
    });
  };

  const connected = !!info.latestBlock;
  const status = connected ? colors.fgSuccess : colors.fgDanger;
  const network = !info.chainName
    ? '-'
    : info.chainName === ChainNameEnum.mainChainName
      ? 'Mainnet'
      : info.chainName === ChainNameEnum.testChainName
        ? 'Testnet'
        : info.chainName === ChainNameEnum.regtestChainName
          ? 'Regtest'
          : 'Unknown (' + info.chainName + ')';

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Server"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <View style={styles.screen}>
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.serverRow}>
            <FontAwesomeIcon size={22} icon={faServer} color={status} />
            <View style={styles.serverStatus}>
              <Text
                numberOfLines={1}
                style={[text.body, { color: colors.fgDefault }]}
              >
                {indexerServer.uri}
              </Text>
              <Text style={[text.footnote, { color: status }]}>
                {connected ? 'Connected' : 'Could not connect to indexer'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.row}>
            <FadeText>Server version</FadeText>
            <Text style={[text.callout, { color: colors.fgDefault }]}>
              {info.version}
            </Text>
          </View>
          <View
            style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
          />
          <View style={styles.row}>
            <FadeText>Network</FadeText>
            <Text style={[text.callout, { color: colors.fgDefault }]}>
              {network}
            </Text>
          </View>
          <View
            style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
          />
          <View style={styles.row}>
            <FadeText>Server block height</FadeText>
            <Text style={[text.callout, { color: colors.fgDefault }]}>
              {info.latestBlock ? info.latestBlock.toString() : ''}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
      >
        <LiquidPrimaryButton
          title={'Switch to different server'}
          onPress={changeServer}
          style={styles.footerButton}
        />
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
  },
  card: {
    borderRadius: radiusCard,
    width: '100%',
    marginTop: space.xl,
    paddingVertical: space.xs,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  serverStatus: {
    flex: 1,
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.xl,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.sm,
    paddingHorizontal: space.xl,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
});

export default SettingsServers;
