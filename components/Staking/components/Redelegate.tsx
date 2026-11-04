import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { ChevronRight } from 'lucide-react-native';

import {
  RouteEnum,
  ScheduledActionType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../../app/AppState';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { useSettings, useWalletData } from '../../../app/store';
import { SessionStackParamList } from '../../../app/types';
import {
  curve,
  duration,
  radiusCard,
  space,
  text,
  useTheme,
} from '../../../app/theme';
import Utils from '../../../app/utils';
import { HeaderTitle } from '../../Header';
import LifehashDisc from '../../Components/LifehashDisc';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import StakingDayBubble from '../StakingDayBubble';
import StakingPositionRow from './StakingPositionRow';
import { bondProblem, bondTransfer } from './bondChecks';

const CSS_EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);
const ROWS_LAYOUT = LinearTransition.duration(duration.list).easing(
  Easing.bezier(curve[0], curve[1], curve[2], curve[3]),
);

type RedelegateProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Redelegate
>;

type EndpointProps = {
  label: string;
  finalizer: string;
  placeholder: string;
  onPress?: () => void;
};

const Endpoint: React.FC<EndpointProps> = ({
  label,
  finalizer,
  placeholder,
  onPress,
}) => {
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
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}, ${finalizer ? Utils.trimToSmall(finalizer, 6) : placeholder}`}
      disabled={!onPress}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          styles.endpoint,
          pressed && onPress && { backgroundColor: colors.bgPress },
          press,
        ]}
      >
        <Text style={[styles.endpointLabel, { color: colors.fgMuted }]}>
          {label}
        </Text>
        <LifehashDisc
          finalizer={finalizer}
          size={28}
          style={{ backgroundColor: colors.bgFaint }}
        />
        <Text
          numberOfLines={1}
          style={[
            text.body,
            styles.endpointValue,
            { color: finalizer ? colors.fgDefault : colors.fgSubtle },
          ]}
        >
          {finalizer ? Utils.trimToSmall(finalizer, 6) : placeholder}
        </Text>
        {onPress && (
          <ChevronRight size={18} strokeWidth={2} color={colors.fgSubtle} />
        )}
      </Animated.View>
    </Pressable>
  );
};

const Redelegate: React.FC<RedelegateProps> = ({ route }) => {
  const finalizer = route.params?.finalizer ?? '';
  const txid = route.params?.txid ?? '';

  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { privacy } = useSettings();
  const { walletBonds, valueTransfers, stakingDay, scheduledActions } =
    useWalletData();

  const positions: WalletBondsType[] = useMemo(
    () =>
      walletBonds
        .filter(b => b.status === WalletBondsStatusEnum.Active)
        .filter(b => (txid ? b.txid === txid : true))
        .filter(b => (finalizer ? b.finalizer === finalizer : true))
        .sort((a, b) => b.amount - a.amount),
    [walletBonds, txid, finalizer],
  );

  const [selectedTxid, setSelectedTxid] = useState<string>(
    txid || (positions.length === 1 ? positions[0].txid : ''),
  );
  const [to, setTo] = useState<string>('');
  const selected = positions.find(b => b.txid === selectedTxid);
  const from = selected?.finalizer ?? finalizer;
  const ready = !!selected && !!to && to !== from;

  const select = useCallback(
    (bond: WalletBondsType) => setSelectedTxid(bond.txid),
    [],
  );

  const pickTo = () =>
    navigation.navigate(RouteEnum.Finalizers, {
      setFinalizer: (f: string) => setTo(f),
      scope: 'network',
      exclude: from,
    });

  const submit = () => {
    if (!selected || !ready) {
      return;
    }
    const transfers = valueTransfers ?? [];
    const problem = bondProblem(
      selected,
      transfers,
      scheduledActions,
      stakingDay,
    );
    if (problem) {
      Alert.alert('Error', problem);
      return;
    }
    const item: ScheduledActionType = {
      id: 0,
      kind: StakingActionKindEnum.Move,
      amount: (bondTransfer(selected, transfers)?.amount || 0) * 10 ** 8,
      finalizer: selected.finalizer,
      finalizerTo: to,
      txid: selected.txid,
      bondKey: selected.pubKey,
    };
    navigation.navigate(RouteEnum.ScheduledActionDetail, { item });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: WalletBondsType; index: number }) => (
      <StakingPositionRow
        testID={`redelegate-position-${index + 1}`}
        bond={item}
        privacy={privacy}
        last={index === positions.length - 1}
        selected={item.txid === selectedTxid}
        onSelect={select}
      />
    ),
    [privacy, positions.length, selectedTxid, select],
  );

  const header = (
    <View style={styles.header}>
      <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
        <Endpoint
          label="From"
          finalizer={from}
          placeholder="Choose a position below"
        />
        <View
          style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
        />
        <Endpoint
          label="To"
          finalizer={to}
          placeholder="Choose a finalizer"
          onPress={pickTo}
        />
      </View>
      <Text style={[text.footnote, styles.section, { color: colors.fgSubtle }]}>
        Position to move
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <HeaderTitle
        title="Redelegate"
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
            No active positions to move.
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
      >
        <LiquidPrimaryButton
          title="Redelegate"
          disabled={!ready}
          onPress={submit}
          style={styles.cta}
        />
      </View>
    </View>
  );
};

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
    paddingTop: space.sm,
  },
  card: {
    borderRadius: radiusCard,
    borderCurve: 'continuous',
    paddingVertical: space.xs,
    overflow: 'hidden',
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  endpointLabel: {
    ...text.caption,
    width: 40,
  },
  endpointValue: {
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.lg,
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
  footer: {
    paddingTop: space.sm,
    paddingHorizontal: space.xxl,
  },
  cta: {
    alignSelf: 'stretch',
  },
});

export default Redelegate;
