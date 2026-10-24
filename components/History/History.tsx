import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { LinearTransition, Easing } from 'react-native-reanimated';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

import {
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  ValueTransferType,
} from '../../app/AppState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../app/context';
import Utils from '../../app/utils';
import { RPCValueTransferStatusEnum } from '../../app/rpc/enums/RPCValueTransferStatusEnum';
import { MainTabParamList } from '../../app/types/NavigationTypes';
import { text, useTheme } from '../../app/theme';
import EmptyState from '../Components/EmptyState';
import HomeSummary, { SUMMARY_RADIUS } from './components/HomeSummary';
import TxRow, { TX_ROW_HEIGHT } from './components/TxRow';

const PAGE = 50;
const FRESH_FOR = 2400;
const ROWS_LAYOUT = LinearTransition.duration(260).easing(
  Easing.bezier(0.23, 1, 0.32, 1),
);

type HistoryProps = NativeStackScreenProps<
  MainTabParamList,
  RouteEnum.History
> & {
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  scrollToTop: boolean;
  setScrollToBottom: (value: boolean) => void;
};

type Line =
  | { type: 'day'; key: string; title: string }
  | { type: 'tx'; key: string; vt: ValueTransferType; last: boolean };

const dayTitle = (time: number) => {
  const d = moment(time * 1000);
  const today = moment().startOf('day');
  if (d.isSameOrAfter(today)) {
    return 'Today';
  }
  if (d.isSameOrAfter(today.clone().subtract(1, 'day'))) {
    return 'Yesterday';
  }
  if (d.isSameOrAfter(today.clone().subtract(6, 'days'))) {
    return d.format('dddd');
  }
  if (d.isSame(today, 'year')) {
    return d.format('D MMMM');
  }
  return d.format('D MMMM YYYY');
};

/** Transactions grouped by day, newest first, as one flat list of lines. */
const toLines = (vts: ValueTransferType[]): Line[] => {
  const out: Line[] = [];
  vts.forEach((vt, i) => {
    const day = moment(vt.time * 1000).format('YYYY-MM-DD');
    const next = vts[i + 1];
    const nextDay = next ? moment(next.time * 1000).format('YYYY-MM-DD') : '';
    if (
      i === 0 ||
      moment(vts[i - 1].time * 1000).format('YYYY-MM-DD') !== day
    ) {
      out.push({ type: 'day', key: `day-${day}`, title: dayTitle(vt.time) });
    }
    out.push({
      type: 'tx',
      key: `${vt.txid}-${vt.kind}-${i}`,
      vt,
      last: nextDay !== day,
    });
  });
  return out;
};

const History: React.FunctionComponent<HistoryProps> = ({
  setScrollToTop,
  scrollToTop,
}) => {
  const navigation: any = useNavigation();
  const { translate, doRefresh } = useAppLoadedActions();
  const { language } = useAppLoadedSettings();
  const { valueTransfers } = useAppLoadedWallet();
  const { colors } = useTheme();
  const screenName = ScreenEnum.History;

  const [shown, setShown] = useState<number>(PAGE);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const listRef = useRef<Animated.FlatList<Line>>(null);
  const known = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  const filtered = useMemo(
    () =>
      (valueTransfers ?? []).filter(
        vt => vt.status !== RPCValueTransferStatusEnum.failed,
      ),
    [valueTransfers],
  );

  useEffect(() => {
    if (valueTransfers !== null) {
      const t = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(t);
    }
  }, [valueTransfers]);

  useEffect(() => {
    const ids = new Set(filtered.map(vt => vt.txid));
    if (!known.current) {
      known.current = ids;
      return;
    }
    const arrived = [...ids].filter(id => !known.current?.has(id));
    known.current = ids;
    if (arrived.length === 0) {
      return;
    }
    setFresh(prev => new Set([...prev, ...arrived]));
    const t = setTimeout(
      () =>
        setFresh(prev => {
          const next = new Set(prev);
          arrived.forEach(id => next.delete(id));
          return next;
        }),
      FRESH_FOR,
    );
    return () => clearTimeout(t);
  }, [filtered]);

  const lines = useMemo(
    () => toLines(filtered.slice(0, shown)),
    [filtered, shown],
  );
  const hasMore = shown < filtered.length;

  const handleScrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setIsAtTop(true);
  }, []);

  useEffect(() => {
    if (scrollToTop) {
      handleScrollToTop();
      setScrollToTop(false);
    }
  }, [scrollToTop, handleScrollToTop, setScrollToTop]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIsAtTop(e.nativeEvent.contentOffset.y <= 100);
    },
    [],
  );

  const openDetail = useCallback(
    (vt: ValueTransferType) => {
      navigation.navigate(RouteEnum.ValueTransferDetail, {
        vt,
        totalLength: filtered.length,
      });
    },
    [navigation, filtered.length],
  );

  const renderLine = useCallback(
    ({ item, index }: { item: Line; index: number }) =>
      item.type === 'day' ? (
        <Text style={[text.footnote, styles.day, { color: colors.fgSubtle }]}>
          {item.title}
        </Text>
      ) : (
        <TxRow
          testID={`vt-${index + 1}`}
          vt={item.vt}
          fresh={fresh.has(item.vt.txid)}
          last={item.last}
          onPress={openDetail}
        />
      ),
    [colors.fgSubtle, fresh, openDetail],
  );

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('history.title-acc') as string}
      style={[styles.screen, { backgroundColor: colors.bgCanvas }]}
    >
      <HomeSummary />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.fgAccent}
          style={styles.spinner}
        />
      ) : lines.length === 0 ? (
        <EmptyState
          art="orbit"
          title="No transactions yet"
          style={styles.emptyState}
        />
      ) : (
        <View style={styles.listWrap}>
          <Animated.FlatList
            ref={listRef}
            data={lines}
            keyExtractor={item => item.key}
            renderItem={renderLine}
            itemLayoutAnimation={ROWS_LAYOUT}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onEndReached={() => hasMore && setShown(n => n + PAGE)}
            onEndReachedThreshold={0.75}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => doRefresh(screenName)}
                tintColor={colors.fgDefault}
                title={translate('history.refreshing') as string}
                progressViewOffset={SUMMARY_RADIUS}
              />
            }
          />
          {!isAtTop && (
            <Pressable
              onPress={handleScrollToTop}
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              style={({ pressed }) => [
                styles.toTop,
                {
                  bottom:
                    !isLiquidGlassSupported &&
                    Platform.OS === GlobalConst.platformOSandroid
                      ? 30
                      : 60,
                  backgroundColor: colors.bgChrome,
                  borderColor: colors.borderMuted,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <FontAwesomeIcon
                size={16}
                icon={faAngleUp}
                color={colors.fgMuted}
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  emptyState: {
    paddingBottom: 108,
  },
  spinner: {
    marginTop: SUMMARY_RADIUS + 20,
    marginBottom: 20,
  },
  listWrap: {
    flex: 1,
    marginTop: -SUMMARY_RADIUS,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: SUMMARY_RADIUS + 4,
    paddingBottom: Platform.OS === GlobalConst.platformOSios ? 100 : 24,
  },
  day: {
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  toTop: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
  },
});

export { TX_ROW_HEIGHT };
export default React.memo(History);
