/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import {
  CurrencyNameEnum,
  GlobalConst,
  RouteEnum,
  ScheduledActionType,
  StakeType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../../app/AppState';
import Stake from '../../../assets/icons/stake-white.svg';
import Unstake from '../../../assets/icons/unstake-white.svg';
import RegText from '../../Components/RegText';
import FadeText from '../../Components/FadeText';
import Utils from '../../../app/utils';
import ZecAmount from '../../Components/ZecAmount';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { formatSeconds } from '../../../app/utils/Utils';
import {
  useTheme,
  text,
  space,
  radiusCard,
  radiusPill,
  curve,
  duration,
} from '../../../app/theme';
import StakingPositionRow, { PositionAction } from './StakingPositionRow';
import FinalizerRow from '../Finalizers/FinalizerRow';
type ScheduledActionsListProps = {
  scheduledActions: ScheduledActionType[];
  walletBonds: WalletBondsType[];
  stakingDay: boolean;
  blocksToStakingDay: number;
  blocksTotalStakingDay: number;
  timeToStakingDaySeconds: number;
  timeLeftStakingDaySeconds: number;
  currencyName: CurrencyNameEnum;
  privacy: boolean;
  dimensionsWidth: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToTopSignal: number;
};

type StakingPositionsListProps = {
  walletBonds: WalletBondsType[];
  privacy: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToTopSignal: number;
};

type FinalizersListProps = {
  staked: StakeType[];
  walletBonds: WalletBondsType[];
  privacy: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToTopSignal: number;
};

const ScheduledActionsListBase = ({
  scheduledActions,
  walletBonds,
  stakingDay,
  blocksToStakingDay,
  blocksTotalStakingDay,
  timeToStakingDaySeconds,
  timeLeftStakingDaySeconds,
  currencyName,
  privacy,
  dimensionsWidth,
  onScroll,
  scrollToTopSignal,
}: ScheduledActionsListProps) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView & FlatList<any>>(null);

  useEffect(() => {
    if (scrollToTopSignal === 0) {
      return;
    }
    try {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      console.log('scrollToTop failed:', error);
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopSignal]);

  return (
    <>
      <FlatList
        ref={scrollViewRef}
        onScroll={onScroll}
        data={scheduledActions}
        keyExtractor={item => `scheduledActions-${item.id}`}
        contentContainerStyle={{
          paddingTop: space.sm,
          paddingBottom: space.xs,
        }}
        ListHeaderComponent={
          <View
            style={{
              borderTopLeftRadius: radiusCard,
              borderTopRightRadius: radiusCard,
              paddingVertical: 10,
              paddingHorizontal: 25,
              paddingTop: 15,
              backgroundColor: colors.bgSurface,
              borderTopColor: stakingDay
                ? colors.fgSuccess
                : colors.borderWarning,
              borderLeftColor: stakingDay
                ? colors.fgSuccess
                : colors.borderWarning,
              borderRightColor: stakingDay
                ? colors.fgSuccess
                : colors.borderWarning,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
            }}
          >
            <Text
              style={[
                text.caption1,
                {
                  color: stakingDay ? colors.fgSuccess : colors.fgWarning,
                },
              ]}
            >
              {'Scheduled'}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {stakingDay ? (
                <View
                  style={{
                    height: 10,
                    borderRadius: radiusPill,
                    backgroundColor: colors.fgSuccess,
                    width: '100%',
                    marginTop: 10,
                  }}
                />
              ) : (
                <>
                  <View
                    style={{
                      height: 10,
                      borderRadius: radiusPill,
                      backgroundColor: colors.borderWarning,
                      width: `${((blocksTotalStakingDay - blocksToStakingDay) * 100) / blocksTotalStakingDay}%`,
                      marginTop: 10,
                    }}
                  />
                  <View
                    style={{
                      height: 10,
                      borderRadius: radiusPill,
                      backgroundColor: colors.fgWarning,
                      width: 20,
                      marginTop: 10,
                      marginLeft: -10,
                      zIndex: 999,
                    }}
                  />
                  <View
                    style={{
                      height: 10,
                      borderRadius: radiusPill,
                      backgroundColor: colors.bgFaint,
                      width: `${(blocksToStakingDay * 100) / blocksTotalStakingDay}%`,
                      marginTop: 10,
                      marginLeft: -10,
                    }}
                  />
                </>
              )}
            </View>
            {/*
              <FadeText>{`to: ${blocksToStakingDay} - total: ${blocksTotalStakingDay}`}</FadeText>
            */}
          </View>
        }
        ListFooterComponent={
          <>
            <View
              style={{
                borderBottomLeftRadius: radiusCard,
                borderBottomRightRadius: radiusCard,
                paddingBottom: 15,
                backgroundColor: colors.bgSurface,
                borderBottomColor: stakingDay
                  ? colors.fgSuccess
                  : colors.borderWarning,
                borderLeftColor: stakingDay
                  ? colors.fgSuccess
                  : colors.borderWarning,
                borderRightColor: stakingDay
                  ? colors.fgSuccess
                  : colors.borderWarning,
                borderBottomWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
              }}
            />
            <View
              style={{
                height: Platform.OS === GlobalConst.platformOSios ? 100 : 10,
              }}
            />
          </>
        }
        renderItem={({ item }: { item: ScheduledActionType }) => {
          let label: string = '';
          let Icon: React.ComponentType<{
            width: number;
            height: number;
          }> | null = null;

          switch (item.kind) {
            case StakingActionKindEnum.CreateBond: {
              label = 'Stake';
              Icon = Stake;
              break;
            }

            case StakingActionKindEnum.BeginUnbonding: {
              // the txid have to be from a create_bond kind
              if (
                item.txid &&
                walletBonds.filter(wb => wb.txid === item.txid).length > 0 &&
                walletBonds.filter(wb => wb.txid === item.txid)[0].status ===
                  WalletBondsStatusEnum.Active
              ) {
                label = 'Unstake';
              } else {
                label = 'Unstake (transaction issue)';
              }
              Icon = Unstake;
              break;
            }

            case StakingActionKindEnum.WithdrawBond: {
              // the txid have to be from a unbonding kind
              if (
                item.txid &&
                walletBonds.filter(wb => wb.txid === item.txid).length > 0 &&
                walletBonds.filter(wb => wb.txid === item.txid)[0].status ===
                  WalletBondsStatusEnum.Unbonding
              ) {
                label = 'Withdraw';
              } else {
                label = 'Withdraw (transaction issue)';
              }
              Icon = Unstake;
              break;
            }

            case StakingActionKindEnum.Move: {
              // the txid have to be from a create_bond kind
              if (
                item.txid &&
                walletBonds.filter(wb => wb.txid === item.txid).length > 0 &&
                walletBonds.filter(wb => wb.txid === item.txid)[0].status ===
                  WalletBondsStatusEnum.Active
              ) {
                label = 'Redelegate';
              } else {
                label = 'Redelegate (transaction issue)';
              }
              Icon = Unstake;
              break;
            }
          }

          return (
            <View
              style={{
                backgroundColor: colors.bgSurface,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderLeftColor: stakingDay
                  ? colors.fgSuccess
                  : colors.borderWarning,
                borderRightColor: stakingDay
                  ? colors.fgSuccess
                  : colors.borderWarning,
                borderLeftWidth: 1,
                borderRightWidth: 1,
              }}
            >
              <TouchableOpacity
                style={{ width: '100%' }}
                onPress={() => {
                  navigation.navigate(RouteEnum.ScheduledActionDetail, {
                    item,
                  });
                }}
              >
                <View
                  style={[
                    styles.scheduledRow,
                    {
                      backgroundColor: stakingDay
                        ? colors.bgSuccessTint
                        : colors.bgFaint,
                    },
                  ]}
                >
                  <View
                    style={{
                      marginVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    {Icon && <Icon width={20} height={20} />}

                    <View>
                      <Text
                        style={[
                          text.caption,
                          {
                            color: colors.fgDefault,
                            marginBottom: 2,
                            marginLeft: 5,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                        }}
                      >
                        <ZecAmount
                          style={{
                            flexGrow: 1,
                            alignSelf: 'auto',
                            justifyContent: 'flex-end',
                          }}
                          size={12}
                          currencyName={currencyName}
                          color={colors.fgDefault}
                          amtZec={
                            item.txid &&
                            walletBonds.filter(wb => wb.txid === item.txid)
                              .length > 0
                              ? walletBonds.filter(
                                  wb => wb.txid === item.txid,
                                )[0].amount
                              : item.amount / 10 ** 8
                          }
                          privacy={privacy}
                        />
                        <Text
                          style={[text.caption1, { color: colors.fgSubtle }]}
                        >
                          {'with '}
                          {item.finalizer.length >
                          (dimensionsWidth < 500 ? 10 : 20)
                            ? Utils.trimToSmall(
                                item.finalizer,
                                dimensionsWidth < 500 ? 5 : 10,
                              )
                            : item.finalizer}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      flexGrow: 1,
                      alignItems: 'flex-end',
                      paddingRight: 20,
                    }}
                  >
                    {stakingDay ? (
                      <>
                        <RegText
                          style={[
                            timeLeftStakingDaySeconds === 0
                              ? text.caption2
                              : text.subheadline,
                            { color: colors.fgSuccess },
                          ]}
                        >
                          {'Now'}
                        </RegText>
                        <FadeText style={text.caption1}>
                          Click to execute
                        </FadeText>
                      </>
                    ) : (
                      <RegText
                        style={[
                          timeToStakingDaySeconds === 0
                            ? text.caption2
                            : text.footnote,
                          { color: colors.fgWarning },
                        ]}
                      >
                        {timeToStakingDaySeconds === 0
                          ? 'calculating...'
                          : formatSeconds(timeToStakingDaySeconds)}
                      </RegText>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </>
  );
};

export const ScheduledActionsList = React.memo<ScheduledActionsListProps>(
  ScheduledActionsListBase,
);

const ROWS_LAYOUT = LinearTransition.duration(duration.list).easing(
  Easing.bezier(curve[0], curve[1], curve[2], curve[3]),
);

const StakingPositionsListBase = ({
  walletBonds,
  privacy,
  onScroll,
  scrollToTopSignal,
}: StakingPositionsListProps) => {
  const navigation: any = useNavigation();
  const listRef = useRef<FlatList<WalletBondsType>>(null);

  const positions: WalletBondsType[] = useMemo(
    () =>
      (walletBonds ?? [])
        .filter(b => b.status !== WalletBondsStatusEnum.Withdrawn)
        .sort((a, b) => b.amount - a.amount),
    [walletBonds],
  );

  useEffect(() => {
    if (scrollToTopSignal === 0) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToTopSignal]);

  const onAction = useCallback(
    (action: PositionAction, bond: WalletBondsType) => {
      const params = {
        finalizer: bond.finalizer,
        txid: bond.txid,
        staked: bond.amount,
      };
      navigation.navigate(
        action === 'redelegate' ? RouteEnum.Redelegate : RouteEnum.Unstake,
        params,
      );
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WalletBondsType; index: number }) => (
      <StakingPositionRow
        testID={`position-${index + 1}`}
        bond={item}
        privacy={privacy}
        last={index === positions.length - 1}
        onAction={onAction}
      />
    ),
    [privacy, positions.length, onAction],
  );

  return (
    <Animated.FlatList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={100}
      data={positions}
      keyExtractor={item => `position-${item.txid}`}
      renderItem={renderItem}
      itemLayoutAnimation={ROWS_LAYOUT}
      contentContainerStyle={styles.positions}
    />
  );
};

export const StakingPositionsList = React.memo<StakingPositionsListProps>(
  StakingPositionsListBase,
);

export const positionsText = (n: number) =>
  n === 1 ? '1 position' : `${n} positions`;

const FinalizersListBase = ({
  staked,
  walletBonds,
  privacy,
  onScroll,
  scrollToTopSignal,
}: FinalizersListProps) => {
  const navigation: any = useNavigation();
  const listRef = useRef<FlatList<StakeType>>(null);

  const finalizers: StakeType[] = useMemo(
    () =>
      staked
        .filter(s => s.votingPower > 0 && !!s.finalizer)
        .sort((a, b) => b.votingPower - a.votingPower),
    [staked],
  );

  const positionsOf = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of walletBonds) {
      if (b.status !== WalletBondsStatusEnum.Withdrawn) {
        counts.set(b.finalizer, (counts.get(b.finalizer) ?? 0) + 1);
      }
    }
    return counts;
  }, [walletBonds]);

  useEffect(() => {
    if (scrollToTopSignal === 0) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToTopSignal]);

  const open = useCallback(
    (finalizer: string) =>
      navigation.navigate(RouteEnum.FinalizerDetail, { finalizer }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: StakeType; index: number }) => (
      <FinalizerRow
        testID={`finalizer-${index + 1}`}
        stake={item}
        detail={positionsText(positionsOf.get(item.finalizer) ?? 0)}
        privacy={privacy}
        last={index === finalizers.length - 1}
        onPress={open}
      />
    ),
    [positionsOf, privacy, finalizers.length, open],
  );

  return (
    <Animated.FlatList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={100}
      data={finalizers}
      keyExtractor={item => `finalizer-${item.finalizer}`}
      renderItem={renderItem}
      itemLayoutAnimation={ROWS_LAYOUT}
      contentContainerStyle={styles.positions}
    />
  );
};

export const FinalizersList =
  React.memo<FinalizersListProps>(FinalizersListBase);

const styles = StyleSheet.create({
  positions: {
    paddingBottom: Platform.OS === GlobalConst.platformOSios ? 100 : 24,
  },
  scheduledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
  },
});
