/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView } from 'react-native';

import DetailLine from '../Components/DetailLine';
import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
import {
  ChainNameEnum,
  CurrencyEnum,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { useTheme } from '../../app/theme';

type InfoProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Info
>;

const Info: React.FunctionComponent<InfoProps> = ({ navigation }) => {
  const { translate, setZecPrice, removeFirstSnackbar } = useAppLoadedActions();
  const { currency, privacy } = useAppLoadedSettings();
  const { info, zecPrice } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Info;

  const insets = useSafeAreaInsets();

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Server info"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <View style={{ display: 'flex', margin: 20 }}>
            <DetailLine
              label={translate('info.version') as string}
              value={translate('zingodelegator') + ' ' + translate('version')}
              screenName={screenName}
            />
            <DetailLine
              label={translate('info.serverversion') as string}
              value={info.version ? info.version : '-'}
              screenName={screenName}
            />
            <DetailLine
              label={translate('info.zainod') as string}
              value={info.serverUri ? info.serverUri : '-'}
              screenName={screenName}
            />
            <DetailLine
              label={translate('info.network') as string}
              value={
                !info.chainName
                  ? '-'
                  : info.chainName === ChainNameEnum.mainChainName
                    ? 'Mainnet'
                    : info.chainName === ChainNameEnum.testChainName
                      ? 'Testnet'
                      : info.chainName === ChainNameEnum.regtestChainName
                        ? 'Regtest'
                        : (translate('info.unknown') as string) +
                          ' (' +
                          info.chainName +
                          ')'
              }
              screenName={screenName}
            />
            <DetailLine
              label={translate('info.serverblock') as string}
              value={info.latestBlock ? info.latestBlock.toString() : '-'}
              screenName={screenName}
            />
            {(currency === CurrencyEnum.USDCurrency ||
              currency === CurrencyEnum.USDTORCurrency) && (
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <DetailLine
                  label={
                    (currency === CurrencyEnum.USDTORCurrency
                      ? translate('info.zecpricetor')
                      : translate('info.zecprice')) as string
                  }
                  screenName={screenName}
                >
                  {zecPrice.zecPrice === -1 && (
                    <RegText color={colors.fgDefault}>
                      {translate('info.errorgemini') as string}
                    </RegText>
                  )}
                  {zecPrice.zecPrice === -2 && (
                    <RegText color={colors.fgDefault}>
                      {translate('info.errorrpcmodule') as string}
                    </RegText>
                  )}
                  <CurrencyAmount
                    price={zecPrice.zecPrice}
                    amtZec={1}
                    currency={currency}
                    privacy={privacy}
                  />
                </DetailLine>
                <View style={{ marginLeft: 5 }}>
                  <PriceFetcher
                    setZecPrice={setZecPrice}
                    screenName={screenName}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

export default Info;
