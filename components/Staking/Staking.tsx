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
import { useTheme, space, radiusPill } from '../../app/theme';
import Segmented from '../Components/Segmented';
import { SUMMARY_RADIUS } from '../Components/SummaryPanel';
import { warmLifehashes } from '../../app/utils/lifehash';

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

type StakingTab = 'scheduled' | 'active' | 'my';

const TABS: { value: StakingTab; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active Stake' },
  { value: 'my', label: 'My Finalizers' },
];

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
    globalStaked,
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
  const [tab, setTab] = useState<StakingTab>(tabParam);
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

  useEffect(() => {
    warmLifehashes([...staked, ...globalStaked].map(s => s.finalizer));
  }, [staked, globalStaked]);

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

  const pane = (name: StakingTab) =>
    tab === name ? styles.pane : styles.paneHidden;

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

        <View style={[styles.tray, { backgroundColor: colors.bgChrome }]}>
          <Segmented options={TABS} value={tab} onChange={setTab} />
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

            {!loading && (
              <>
                <View style={pane('scheduled')}>
                  {hasScheduledActions ? (
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
                  ) : (
                    <EmptyState
                      art="pair"
                      title="No scheduled actions yet."
                      style={styles.emptyState}
                    />
                  )}
                </View>

                <View style={pane('active')}>
                  {hasMovements ? (
                    <StakingPositionsList
                      walletBonds={walletBonds}
                      privacy={privacy}
                      onScroll={handleScroll}
                      scrollToTopSignal={scrollToTopSignal}
                    />
                  ) : (
                    <EmptyState
                      art="pair"
                      title="No staking positions yet."
                      style={styles.emptyState}
                    />
                  )}
                </View>

                <View style={pane('my')}>
                  {hasStaked ? (
                    <FinalizersList
                      staked={staked}
                      walletBonds={walletBonds}
                      privacy={privacy}
                      onScroll={handleScroll}
                      scrollToTopSignal={scrollToTopSignal}
                    />
                  ) : (
                    <EmptyState
                      art="pair"
                      title="No active finalizers yet."
                      style={styles.emptyState}
                    />
                  )}
                </View>
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
  tray: {
    marginTop: -SUMMARY_RADIUS,
    marginHorizontal: space.xl,
    paddingTop: SUMMARY_RADIUS + space.xs,
    paddingBottom: space.xs,
    paddingHorizontal: space.xs,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderCurve: 'continuous',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pane: {
    flex: 1,
  },
  paneHidden: {
    display: 'none',
  },
  emptyState: {
    paddingBottom: 96,
  },
});

export default Staking;
