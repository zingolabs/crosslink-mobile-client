import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';

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
import { space, useTheme } from '../../app/theme';

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={styles.center}>
          <View style={styles.pools}>
            {totalBalance && (
              <>
                {!orchardPool && !saplingPool && !transparentPool && (
                  <ActivityIndicator
                    size="large"
                    color={colors.fgAccent}
                    style={styles.loader}
                  />
                )}
                {orchardPool && (
                  <>
                    <BoldText>
                      {translate('pools.orchard-title') as string}
                    </BoldText>

                    <View style={styles.poolSection}>
                      <DetailLine
                        label={translate('pools.orchard-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="orchard-total-balance"
                          amtZec={totalBalance.totalOrchardBalance}
                          size={18}
                          currencyName={info.currencyName}
                          style={
                            totalBalance.confirmedOrchardBalance > 0 &&
                            totalBalance.confirmedOrchardBalance ===
                              totalBalance.totalOrchardBalance
                              ? styles.amountConfirmed
                              : styles.amountPending
                          }
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
                              : colors.fgDanger
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderFaint },
                      ]}
                    />
                  </>
                )}

                {saplingPool && (
                  <>
                    <BoldText>
                      {translate('pools.sapling-title') as string}
                    </BoldText>

                    <View style={styles.poolSection}>
                      <DetailLine
                        label={translate('pools.sapling-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="sapling-total-balance"
                          amtZec={totalBalance.totalSaplingBalance}
                          size={18}
                          currencyName={info.currencyName}
                          style={
                            totalBalance.confirmedSaplingBalance > 0 &&
                            totalBalance.confirmedSaplingBalance ===
                              totalBalance.totalSaplingBalance
                              ? styles.amountConfirmed
                              : styles.amountPending
                          }
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
                              : colors.fgDanger
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: colors.borderFaint },
                      ]}
                    />
                  </>
                )}

                {transparentPool && (
                  <>
                    <BoldText>
                      {translate('pools.transparent-title') as string}
                    </BoldText>

                    <View style={styles.poolSection}>
                      <DetailLine
                        label={translate('pools.transparent-balance') as string}
                        screenName={screenName}
                      >
                        <ZecAmount
                          testID="transparent-balance"
                          amtZec={totalBalance.totalTransparentBalance}
                          size={18}
                          currencyName={info.currencyName}
                          color={colors.fgDanger}
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
                          color={colors.fgDanger}
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
                      style={[
                        styles.infoChip,
                        { backgroundColor: colors.bgCanvas },
                      ]}
                    >
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        size={20}
                        color={colors.fgAccent}
                        style={styles.infoIcon}
                      />
                      <FadeText>{translate('pools.dust') as string}</FadeText>
                    </View>
                  )}

                {somePending && (
                  <View
                    style={[
                      styles.infoChip,
                      { backgroundColor: colors.bgCanvas },
                    ]}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={20}
                      color={colors.fgAccent}
                      style={styles.infoIcon}
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

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
  },
  center: {
    flexGrow: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pools: {
    display: 'flex',
    margin: space.xl,
    marginBottom: space.xxxl,
  },
  loader: {
    marginVertical: space.xl,
  },
  poolSection: {
    display: 'flex',
    marginLeft: space.xxl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  infoChip: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: space.xs,
    padding: space.xs,
    borderRadius: 10,
  },
  infoIcon: {
    marginRight: space.xs,
  },
  amountConfirmed: {
    opacity: 1,
  },
  amountPending: {
    opacity: 0.5,
  },
});

export default Pools;
