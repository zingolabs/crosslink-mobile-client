/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';

import ZecAmount from '../Components/ZecAmount';
import BoldText from '../Components/BoldText';
import DetailLine from '../Components/DetailLine';
import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../Components/FadeText';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { useTheme } from '../../app/theme';

type PoolsProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Pools
>;

const Pools: React.FunctionComponent<PoolsProps> = ({ navigation }) => {
  const { translate, removeFirstSnackbar } = useAppLoadedActions();
  const { privacy, orchardPool, saplingPool, transparentPool } =
    useAppLoadedSettings();
  const { totalBalance, info, somePending, shieldingAmount } =
    useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Pools;

  const insets = useSafeAreaInsets();

  //console.log('render pools. Balance:', totalBalance, orchardPool, saplingPool, transparentPool);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Fund pools"
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
          paddingTop: insets.top + 8,
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
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            {totalBalance && (
              <>
                {!orchardPool && !saplingPool && !transparentPool && (
                  <ActivityIndicator
                    size="large"
                    color={colors.fgAccent}
                    style={{ marginVertical: 20 }}
                  />
                )}
                {orchardPool && (
                  <>
                    <BoldText>
                      {translate('pools.orchard-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.orchard-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="orchard-total-balance"
                          amtZec={totalBalance.totalOrchardBalance}
                          size={18}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.confirmedOrchardBalance > 0 &&
                              totalBalance.confirmedOrchardBalance ===
                                totalBalance.totalOrchardBalance
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate('pools.orchard-confirmed-balance') as string
                        }
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="orchard-confirmed-balance"
                          amtZec={totalBalance.confirmedOrchardBalance}
                          size={18}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.confirmedOrchardBalance > 0 &&
                            totalBalance.confirmedOrchardBalance ===
                              totalBalance.totalOrchardBalance
                              ? colors.fgAccent
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{
                        height: 1,
                        width: '100%',
                        backgroundColor: 'white',
                        marginTop: 15,
                        marginBottom: 10,
                      }}
                    />
                  </>
                )}

                {saplingPool && (
                  <>
                    <BoldText>
                      {translate('pools.sapling-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.sapling-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="sapling-total-balance"
                          amtZec={totalBalance.totalSaplingBalance}
                          size={18}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.confirmedSaplingBalance > 0 &&
                              totalBalance.confirmedSaplingBalance ===
                                totalBalance.totalSaplingBalance
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate('pools.sapling-confirmed-balance') as string
                        }
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="sapling-confirmed-balance"
                          amtZec={totalBalance.confirmedSaplingBalance}
                          size={18}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.confirmedSaplingBalance > 0 &&
                            totalBalance.confirmedSaplingBalance ===
                              totalBalance.totalSaplingBalance
                              ? colors.fgSyncing
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{
                        height: 1,
                        width: '100%',
                        backgroundColor: 'white',
                        marginTop: 15,
                        marginBottom: 10,
                      }}
                    />
                  </>
                )}

                {transparentPool && (
                  <>
                    <BoldText>
                      {translate('pools.transparent-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.transparent-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="transparent-balance"
                          amtZec={totalBalance.totalTransparentBalance}
                          size={18}
                          currencyName={info.currencyName}
                          color={'red'}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate(
                            'pools.transparent-confirmed-balance',
                          ) as string
                        }
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="transparent-confirmed-balance"
                          amtZec={totalBalance.confirmedTransparentBalance}
                          size={18}
                          currencyName={info.currencyName}
                          color={'red'}
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>
                  </>
                )}

                {transparentPool &&
                  totalBalance.confirmedTransparentBalance > 0 &&
                  shieldingAmount === 0 &&
                  !somePending && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        marginTop: 5,
                        backgroundColor: colors.bgCanvas,
                        padding: 5,
                        borderRadius: 10,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        size={20}
                        color={colors.fgAccent}
                        style={{ marginRight: 5 }}
                      />
                      <FadeText>{translate('pools.dust') as string}</FadeText>
                    </View>
                  )}

                {somePending && (
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      marginTop: 5,
                      backgroundColor: colors.bgCanvas,
                      padding: 5,
                      borderRadius: 10,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={20}
                      color={colors.fgAccent}
                      style={{ marginRight: 5 }}
                    />
                    <FadeText>{translate('send.somefunds') as string}</FadeText>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

export default Pools;
