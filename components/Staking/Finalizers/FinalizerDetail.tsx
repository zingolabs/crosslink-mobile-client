import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  Easing,
  LinearTransition,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  WalletBondsType,
} from '../../../app/AppState';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { useFeedback, useSettings, useWalletData } from '../../../app/context';
import { SessionStackParamList } from '../../../app/types';
import {
  curve,
  duration,
  mono,
  radiusCard,
  space,
  text,
  useTheme,
} from '../../../app/theme';
import Utils from '../../../app/utils';
import { HeaderTitle } from '../../Header';
import LifehashDisc from '../../Components/LifehashDisc';
import { formatBalance } from '../../Components/SummaryPanel';
import StakingDayBubble from '../StakingDayBubble';
import StakingPositionRow, {
  PositionAction,
} from '../components/StakingPositionRow';

const MASK = '••••';
const CSS_EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);
const ROWS_LAYOUT = LinearTransition.duration(duration.list).easing(
  Easing.bezier(curve[0], curve[1], curve[2], curve[3]),
);

type FinalizerDetailProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.FinalizerDetail
>;

const PressFeedback: React.FC<{
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}> = ({ accessibilityLabel, onPress, children }) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          styles.pressIdle,
          pressed && { backgroundColor: colors.bgPress },
          press,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export function FinalizerDetail({ route }: FinalizerDetailProps) {
  const finalizer = route.params?.finalizer ?? '';
  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { privacy } = useSettings();
  const { addLastSnackbar, translate } = useFeedback();
  const { walletBonds, globalStaked, info } = useWalletData();

  const positions: WalletBondsType[] = useMemo(
    () =>
      walletBonds
        .filter(
          b =>
            b.finalizer === finalizer &&
            b.status !== WalletBondsStatusEnum.Withdrawn,
        )
        .sort((a, b) => b.amount - a.amount),
    [walletBonds, finalizer],
  );

  const yourStake = positions.reduce((sum, b) => sum + b.amount, 0);
  const totalStake =
    globalStaked.find(g => g.finalizer === finalizer)?.votingPower ?? 0;
  const show = (n: number) =>
    privacy ? MASK : `${formatBalance(n)} ${info.currencyName}`;

  const copyId = () => {
    Clipboard.setString(finalizer);
    addLastSnackbar({
      message: translate('txtcopied') as string,
      duration: SnackbarDurationEnum.short,
      screenName: [ScreenEnum.FinalizerDetail],
    });
  };

  const onAction = useCallback(
    (action: PositionAction, bond: WalletBondsType) => {
      navigation.navigate(
        action === 'redelegate' ? RouteEnum.Redelegate : RouteEnum.Unstake,
        { finalizer: bond.finalizer, txid: bond.txid, staked: bond.amount },
      );
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WalletBondsType; index: number }) => (
      <StakingPositionRow
        testID={`finalizer-position-${index + 1}`}
        bond={item}
        privacy={privacy}
        last={index === positions.length - 1}
        onAction={onAction}
      />
    ),
    [privacy, positions.length, onAction],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <LifehashDisc finalizer={finalizer} size={64} />
        <Text style={[text.title3, { color: colors.fgDefault }]}>
          {Utils.trimToSmall(finalizer, 8)}
        </Text>
        <Text style={[text.footnote, { color: colors.fgSubtle }]}>
          Finalizer
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.fgMuted }]}>
            Your stake
          </Text>
          <Text style={[styles.value, { color: colors.fgDefault }]}>
            {show(yourStake)}
          </Text>
        </View>
        <View
          style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
        />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.fgMuted }]}>
            Total staked
          </Text>
          <Text style={[styles.value, { color: colors.fgDefault }]}>
            {show(totalStake)}
          </Text>
        </View>
        <View
          style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
        />
        <PressFeedback accessibilityLabel="Copy finalizer id" onPress={copyId}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.fgMuted }]}>Id</Text>
            <Text
              numberOfLines={1}
              style={[styles.monoValue, { color: colors.fgDefault }]}
            >
              {Utils.trimToSmall(finalizer, 10)}
            </Text>
          </View>
        </PressFeedback>
      </View>

      <Text style={[text.footnote, styles.section, { color: colors.fgSubtle }]}>
        Positions
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <HeaderTitle
        title="Finalizer"
        goBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        ExtraComponent={<StakingDayBubble />}
      />
      <Animated.FlatList
        data={positions}
        keyExtractor={item => item.txid}
        renderItem={renderItem}
        itemLayoutAnimation={ROWS_LAYOUT}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text
            style={[text.footnote, styles.empty, { color: colors.fgSubtle }]}
          >
            No positions with this finalizer.
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
  header: {
    paddingHorizontal: 10,
  },
  hero: {
    alignItems: 'center',
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  card: {
    borderRadius: radiusCard,
    borderCurve: 'continuous',
    paddingVertical: space.xs,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowLabel: {
    ...text.caption,
    flexShrink: 0,
  },
  value: {
    ...text.body,
    textAlign: 'right',
  },
  monoValue: {
    ...mono,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'right',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.lg,
  },
  pressIdle: {
    backgroundColor: 'transparent',
  },
  section: {
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingTop: space.xxl,
    paddingBottom: space.xs,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: space.lg,
  },
});
