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
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  StakeType,
} from '../../app/AppState';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import StakingSummary from './components/StakingSummary';
import EmptyState from '../Components/EmptyState';
import { useFeedback, useSettings, useWalletData } from '../../app/context';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import {
  FinalizersList,
  ScheduledActionsList,
  StakingPositionsList,
} from './components/StakingLists';
import { MainTabParamList } from '../../app/types/NavigationTypes';
import { useTheme, text, space, radiusPill } from '../../app/theme';

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

  const { removeFirstSnackbar } = useFeedback();
  const { privacy } = useSettings();
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
  } = useWalletData();
  const { snackbars } = useFeedback();

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const [tab, setTab] = useState<'scheduled' | 'active' | 'my'>(tabParam);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const [scrollToTopSignal, setScrollToTopSignal] = useState<number>(0);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    if (route.params && route.params.tab) {
      setTab(route.params.tab);
    }
  }, [route.params, route.params?.tab]);

  const hasMovements: boolean = useMemo(() => {
    if (!walletBonds) {
      return false;
    }

    return (
      walletBonds.filter(b => b.status !== WalletBondsStatusEnum.Withdrawn)
        .length > 0
    );
  }, [walletBonds]);

  const hasStaked: boolean = useMemo(
    () => staked.some((i: StakeType) => i.votingPower > 0 && !!i.finalizer),
    [staked],
  );

  const { colors } = useTheme();

  const hasScheduledActions = scheduledActions.length > 0;

  const handleScrollToTop = useCallback(() => {
    if (!isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Signal the mounted list to scroll its own ref to the top
      setScrollToTopSignal(signal => signal + 1);
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
              <ScheduledActionsList
                scheduledActions={scheduledActions}
                walletBonds={walletBonds}
                stakingDay={stakingDay}
                blocksToStakingDay={blocksToStakingDay}
                blocksTotalStakingDay={blocksTotalStakingDay}
                timeToStakingDaySeconds={timeToStakingDay}
                timeLeftStakingDaySeconds={timeLeftStakingDay}
                currencyName={info.currencyName}
                privacy={privacy}
                dimensionsWidth={dimensions.width}
                onScroll={handleScroll}
                scrollToTopSignal={scrollToTopSignal}
              />
            )}

            {!loading && hasMovements && tab === 'active' && (
              <StakingPositionsList
                walletBonds={walletBonds}
                currencyName={info.currencyName}
                privacy={privacy}
                dimensionsWidth={dimensions.width}
                onScroll={handleScroll}
                scrollToTopSignal={scrollToTopSignal}
              />
            )}

            {!loading && hasStaked && tab === 'my' && (
              <FinalizersList
                staked={staked}
                currencyName={info.currencyName}
                dimensionsWidth={dimensions.width}
                onScroll={handleScroll}
                scrollToTopSignal={scrollToTopSignal}
              />
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
});

export default Staking;
