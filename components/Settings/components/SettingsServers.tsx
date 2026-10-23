/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';

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
import RegText from '../../Components/RegText';
import FadeText from '../../Components/FadeText';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { useTheme } from '../../../app/theme';
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
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsServers;

  const changeServer = () => {
    navigateToLoadingApp({
      entry: LoadingAppEntryEnum.menu,
      startingApp: false,
    });
  };

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

      <View
        style={{
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              borderRadius: 26,
              backgroundColor: colors.bgSurface,
              width: '100%',
              marginTop: 40,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 10,
                marginHorizontal: 40,
                width: '80%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 15,
                    alignItems: 'center',
                  }}
                >
                  <FontAwesomeIcon
                    size={25}
                    icon={faServer}
                    color={!info.latestBlock ? '#ff383c' : '#0E9634'}
                  />
                  <View>
                    <RegText>{indexerServer.uri}</RegText>
                    <RegText
                      style={{
                        color: !info.latestBlock ? '#ff383c' : '#0E9634',
                      }}
                    >
                      {info.latestBlock
                        ? 'Connected'
                        : 'Could not connect to indexer'}
                    </RegText>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              borderRadius: 26,
              backgroundColor: colors.bgSurface,
              width: '100%',
              marginTop: 20,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Server version</FadeText>
                <RegText style={{ fontSize: 13 }}>{info.version}</RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.bgMuted }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Network</FadeText>
                <RegText style={{ fontSize: 13 }}>
                  {!info.chainName
                    ? '-'
                    : info.chainName === ChainNameEnum.mainChainName
                      ? 'Mainnet'
                      : info.chainName === ChainNameEnum.testChainName
                        ? 'Testnet'
                        : info.chainName === ChainNameEnum.regtestChainName
                          ? 'Regtest'
                          : 'Unknown (' + info.chainName + ')'}
                </RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.bgMuted }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Server block height</FadeText>
                <RegText style={{ fontSize: 13 }}>
                  {info.latestBlock ? info.latestBlock.toString() : ''}
                </RegText>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <LiquidPrimaryButton
          title={'Switch to different server'}
          onPress={changeServer}
          style={{ alignSelf: 'stretch' }}
        />
      </View>
    </ToastProvider>
  );
};

export default SettingsServers;
