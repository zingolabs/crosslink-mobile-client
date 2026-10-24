/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  GlobalConst,
  RouteEnum,
  ScheduledActionType,
  ScreenEnum,
  StakeType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../app/AppState';
import StakingSummary from './components/StakingSummary';
import EmptyState from '../Components/EmptyState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import Stake from '../../assets/icons/stake-white.svg';
import Unstake from '../../assets/icons/unstake-white.svg';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { lifehashDataUrlFromStringSync } from '../../app/utils/lifehash';
import ZecAmount from '../Components/ZecAmount';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import Button from '../Components/Button';
import { formatSeconds } from '../../app/utils/Utils';
import { MainTabParamList } from '../../app/types/NavigationTypes';
import { useTheme, text, space, radiusCard, radiusPill } from '../../app/theme';

type Finalizer = {
  svg: {
    data: string;
  };
  value: number;
  key: string;
  finalizer: string;
  tag: string;
};

// const formatMovementDate = (unixSeconds: number | undefined) => {
//   if (!unixSeconds) return '-';
//   const d = new Date(unixSeconds * 1000);
//   return d.toLocaleString(undefined, {
//     month: 'short', // "Oct"
//     day: 'numeric', // "10"
//     hour: 'numeric',
//     minute: '2-digit',
//   }); // "Oct 10, 4:30 PM"
// };

type StakingProps = NativeStackScreenProps<
  MainTabParamList,
  RouteEnum.StakingHome
>;

const Staking: React.FC<StakingProps> = ({ route }) => {
  const tabParam =
    !!route.params && route.params.tab !== undefined
      ? route.params.tab
      : 'active';

  const navigation: any = useNavigation();
  const { removeFirstSnackbar } = useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const {
    staked,
    info,
    stakingDay,
    timeToStakingDaySeconds: timeToStakingDay,
    timeLeftStakingDaySeconds: timeLeftStakingDay,
    scheduledActions,
    walletBonds,
    blocksToStakingDay,
    blocksTotalStakingDay,
  } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const [tab, setTab] = useState<'scheduled' | 'active' | 'my'>(tabParam);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const scrollViewRef = useRef<ScrollView & FlatList<any>>(null);

  useEffect(() => {
    if (route.params && route.params.tab) {
      setTab(route.params.tab);
    }
  }, [route.params, route.params?.tab]);

  const movements: WalletBondsType[] = useMemo(() => {
    if (!walletBonds) {
      return [];
    }

    return walletBonds
      .filter(b => {
        // all bonds
        if (b.status === WalletBondsStatusEnum.Withdrawn) return false;
        return true;
      })
      .sort((a, b) => b.amount - a.amount);
  }, [walletBonds]);

  const stakedData: Finalizer[] = useMemo(() => {
    const resultJSON: StakeType[] = staked;
    // const randomColors = Utils.generateColorList(resultJSON.length + 10);
    const r = resultJSON
      .filter((i: StakeType) => i.votingPower > 0 && !!i.finalizer)
      .sort((a, b) => b.votingPower - a.votingPower)
      .map((item, index) => {
        return {
          value: item.votingPower,
          finalizer: item.finalizer,
          tag: '',
          svg: {
            data: lifehashDataUrlFromStringSync(item.finalizer),
          },
          key: `pie-${index}`,
        };
      });
    return r;
  }, [staked]);

  const { colors } = useTheme();

  const hasMovements = movements.length > 0;
  const hasStaked = stakedData.length > 0;
  const hasScheduledActions = scheduledActions.length > 0;

  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Try multiple scroll methods for reliability
      try {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } catch (error) {
        console.log('scrollToTop failed:', error);
        scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isTop = contentOffset.y <= 100;

      // Always update isAtTop for manual scrolling
      setIsAtTop(isTop);

      // If we're scrolling to top and we've reached the top, stop the scrolling state
      if (isScrollingToTop && isTop) {
        setIsScrollingToTop(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }
    },
    [isScrollingToTop],
  );

  const line = (item: Finalizer, index: number, last: boolean) => {
    return (
      <TouchableOpacity
        style={{ width: '100%' }}
        key={`tag-${index}`}
        onPress={() => {
          navigation.navigate(RouteEnum.FinalizerDetail, {
            finalizer: item.finalizer,
            lifehash: item.svg.data,
          });
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginHorizontal: space.xl,
            paddingVertical: 15,
            borderBottomColor: colors.borderFaint,
            borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={{ uri: item.svg.data }}
              style={{
                width: 28,
                height: 28,
                marginRight: space.sm,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
            {!!item.tag && (
              <FadeText style={{ marginHorizontal: 5 }}>{item.tag}</FadeText>
            )}

            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                flexWrap: 'wrap',
              }}
            >
              <RegText>
                {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                  ? Utils.trimToSmall(
                      item.finalizer,
                      dimensions.width < 500 ? 5 : 10,
                    )
                  : item.finalizer}
              </RegText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Stake width={15} height={15} style={{ opacity: 0.7 }} />
                <ZecAmount
                  amtZec={item.value}
                  size={14}
                  currencyName={info.currencyName}
                />
              </View>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: space.sm, marginLeft: 15 }}
              size={15}
              icon={faChevronRight}
              color={colors.fgDefault}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  console.log('scheduled actions', scheduledActions);

  console.log(
    'render staking',
    stakingDay,
    timeToStakingDay,
    timeLeftStakingDay,
  );

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        accessible={true}
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
        }}
      >
        <StakingSummary />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: space.xl,
            borderRadius: 20,
            backgroundColor: colors.bgSurface,
            padding: 5,
            marginHorizontal: space.xl,
          }}
        >
          <TouchableOpacity
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor:
                tab === 'scheduled' ? colors.bgFaint : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
            onPress={() => setTab('scheduled')}
            hitSlop={10}
          >
            <View>
              <RegText
                style={[
                  text.subheadline,
                  {
                    fontWeight: tab === 'scheduled' ? '600' : '400',
                    color: colors.fgDefault,
                  },
                ]}
              >
                {'Scheduled'}
              </RegText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor:
                tab === 'active' ? colors.bgFaint : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
            onPress={() => setTab('active')}
            hitSlop={10}
          >
            <View>
              <RegText
                style={[
                  text.subheadline,
                  {
                    fontWeight: tab === 'active' ? '600' : '400',
                    color: colors.fgDefault,
                  },
                ]}
              >
                {'Active Stake'}
              </RegText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: tab === 'my' ? colors.bgFaint : 'transparent',
              padding: 5,
              overflow: 'hidden',
            }}
            onPress={() => setTab('my')}
            hitSlop={10}
          >
            <View>
              <RegText
                style={[
                  text.subheadline,
                  {
                    fontWeight: tab === 'my' ? '600' : '400',
                    color: colors.fgDefault,
                  },
                ]}
              >
                {'My Finalizers'}
              </RegText>
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: 10,
            paddingTop: 15,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            {loading && (
              <View style={styles.centerContent}>
                <ActivityIndicator size="small" color={colors.fgDefault} />
              </View>
            )}

            {/* TODO: Use Router */}
            {!loading && !hasScheduledActions && tab === 'scheduled' && (
              <EmptyState
                art="pair"
                title="No scheduled actions yet."
                style={styles.emptyState}
              />
            )}

            {!loading && !hasMovements && tab === 'active' && (
              <EmptyState
                art="pair"
                title="No staking positions yet."
                style={styles.emptyState}
              />
            )}

            {!loading && !hasStaked && tab === 'my' && (
              <EmptyState
                art="pair"
                title="No active finalizers yet."
                style={styles.emptyState}
              />
            )}

            {!loading && hasScheduledActions && tab === 'scheduled' && (
              <>
                <FlatList
                  ref={scrollViewRef}
                  onScroll={handleScroll}
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
                            color: stakingDay
                              ? colors.fgSuccess
                              : colors.fgWarning,
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
                          height:
                            Platform.OS === GlobalConst.platformOSios
                              ? 100
                              : 10,
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
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Active
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
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Unbonding
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
                          walletBonds.filter(wb => wb.txid === item.txid)
                            .length > 0 &&
                          walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .status === WalletBondsStatusEnum.Active
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
                            navigation.navigate(
                              RouteEnum.ScheduledActionDetail,
                              {
                                item,
                              },
                            );
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
                                    currencyName={info.currencyName}
                                    color={colors.fgDefault}
                                    amtZec={
                                      item.txid &&
                                      walletBonds.filter(
                                        wb => wb.txid === item.txid,
                                      ).length > 0
                                        ? walletBonds.filter(
                                            wb => wb.txid === item.txid,
                                          )[0].amount
                                        : item.amount / 10 ** 8
                                    }
                                    privacy={privacy}
                                  />
                                  <Text
                                    style={[
                                      text.caption1,
                                      { color: colors.fgSubtle },
                                    ]}
                                  >
                                    {'with '}
                                    {item.finalizer.length >
                                    (dimensions.width < 500 ? 10 : 20)
                                      ? Utils.trimToSmall(
                                          item.finalizer,
                                          dimensions.width < 500 ? 5 : 10,
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
                                      timeLeftStakingDay === 0
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
                                    timeToStakingDay === 0
                                      ? text.caption2
                                      : text.footnote,
                                    { color: colors.fgWarning },
                                  ]}
                                >
                                  {timeToStakingDay === 0
                                    ? 'calculating...'
                                    : formatSeconds(timeToStakingDay)}
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
            )}

            {!loading && hasMovements && tab === 'active' && (
              <FlatList
                ref={scrollViewRef}
                onScroll={handleScroll}
                data={movements}
                keyExtractor={item => `movements-${item.txid}`}
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
                      borderTopColor: colors.borderFaint,
                      borderLeftColor: colors.borderFaint,
                      borderRightColor: colors.borderFaint,
                      borderTopWidth: 1,
                      borderLeftWidth: 1,
                      borderRightWidth: 1,
                    }}
                  >
                    <Text style={[text.headline, { color: colors.fgDefault }]}>
                      {'Staking Positions'}
                    </Text>
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
                        borderBottomColor: colors.borderFaint,
                        borderLeftColor: colors.borderFaint,
                        borderRightColor: colors.borderFaint,
                        borderBottomWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                      }}
                    />
                    <View
                      style={{
                        height:
                          Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                      }}
                    />
                  </>
                }
                renderItem={({ item }: { item: WalletBondsType }) => {
                  return (
                    <View
                      style={{
                        backgroundColor: colors.bgSurface,
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderLeftColor: colors.borderFaint,
                        borderRightColor: colors.borderFaint,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: colors.bgSurface,
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderRadius: 16,
                        }}
                      >
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
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
                                {item.finalizer.length >
                                (dimensions.width < 500 ? 10 : 20)
                                  ? Utils.trimToSmall(
                                      item.finalizer,
                                      dimensions.width < 500 ? 5 : 10,
                                    )
                                  : item.finalizer}
                              </Text>
                              <Text
                                style={[
                                  text.caption1,
                                  { color: colors.fgSubtle, marginLeft: 5 },
                                ]}
                              >
                                2026
                                {/* {formatMovementDate(
                                  valueTransfers?.filter(
                                    vt => vt.txid === item.txid,
                                  )[0]?.time,
                                )} */}
                              </Text>
                            </View>
                          </View>

                          <ZecAmount
                            style={{
                              flexGrow: 1,
                              alignSelf: 'auto',
                              justifyContent: 'flex-end',
                            }}
                            size={14}
                            currencyName={info.currencyName}
                            color={colors.fgDefault}
                            amtZec={item.amount}
                            privacy={privacy}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 10,
                            gap: space.sm,
                          }}
                        >
                          {item.status === WalletBondsStatusEnum.Active && (
                            <View
                              style={{
                                flexDirection: 'row',
                                gap: space.sm,
                                width: '100%',
                              }}
                            >
                              <Button
                                title={'Redelegate'}
                                variant="secondary"
                                style={{ width: '48%' }}
                                onPress={() => {
                                  navigation.navigate(RouteEnum.Redelegate, {
                                    finalizer: item.finalizer,
                                    txid: item.txid,
                                    staked: item.amount,
                                  });
                                }}
                              />
                              <Button
                                variant="primary"
                                title={'Unstake'}
                                style={{ width: '48%' }}
                                onPress={() => {
                                  navigation.navigate(RouteEnum.Unstake, {
                                    finalizer: item.finalizer,
                                    txid: item.txid,
                                    staked: item.amount,
                                  });
                                }}
                              />
                            </View>
                          )}
                          {item.status === WalletBondsStatusEnum.Unbonding && (
                            <Button
                              title={'Withdraw'}
                              variant="primary"
                              style={{ width: '48%' }}
                              onPress={() => {
                                navigation.navigate(RouteEnum.Unstake, {
                                  finalizer: item.finalizer,
                                  txid: item.txid,
                                  staked: item.amount,
                                });
                              }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {!loading && hasStaked && tab === 'my' && (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  onScroll={handleScroll}
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                  indicatorStyle={'white'}
                  style={{ maxHeight: '100%' }}
                  contentContainerStyle={{}}
                >
                  <View
                    style={{
                      marginTop: 5,
                      display: 'flex',
                      marginHorizontal: 10,
                      padding: 5,
                      alignItems: 'flex-start',
                      backgroundColor: colors.bgSurface,
                      borderRadius: radiusCard,
                    }}
                  >
                    {stakedData.map((item, index) => {
                      return line(item, index, index + 1 === stakedData.length);
                    })}
                  </View>
                  <View
                    style={{
                      height:
                        Platform.OS === GlobalConst.platformOSios ? 100 : 10,
                    }}
                  />
                </ScrollView>
              </>
            )}

            {!isAtTop && (
              <Pressable
                onPress={handleScrollToTop}
                disabled={isScrollingToTop}
                style={({ pressed }) => ({
                  position: 'absolute',
                  bottom:
                    !isLiquidGlassSupported &&
                    Platform.OS === GlobalConst.platformOSandroid
                      ? 30
                      : 60,
                  right: 10,
                  paddingHorizontal: 5,
                  paddingVertical: 10,
                  backgroundColor: colors.bgChrome,
                  borderRadius: radiusPill,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  borderWidth: 1,
                  borderColor: colors.borderMuted,
                  opacity: isScrollingToTop ? 0.5 : 1,
                })}
              >
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={16}
                  icon={faAngleUp}
                  color={colors.fgMuted}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingBottom: 96,
  },
  scheduledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
  },
});

export default Staking;
