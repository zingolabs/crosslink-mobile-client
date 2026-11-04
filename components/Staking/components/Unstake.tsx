import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  RouteEnum,
  ScheduledActionType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../../app/AppState';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { useSettings, useWalletData } from '../../../app/context';
import { SessionStackParamList } from '../../../app/types';
import { curve, duration, space, text, useTheme } from '../../../app/theme';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import StakingDayBubble from '../StakingDayBubble';
import StakingPositionRow from './StakingPositionRow';
import { bondProblem, bondTransfer } from './bondChecks';

const ROWS_LAYOUT = LinearTransition.duration(duration.list).easing(
  Easing.bezier(curve[0], curve[1], curve[2], curve[3]),
);

type UnstakeProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Unstake
>;

const Unstake: React.FC<UnstakeProps> = ({ route }) => {
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
        .filter(b => b.status !== WalletBondsStatusEnum.Withdrawn)
        .filter(b => (txid ? b.txid === txid : true))
        .filter(b => (finalizer ? b.finalizer === finalizer : true))
        .sort((a, b) => b.amount - a.amount),
    [walletBonds, txid, finalizer],
  );

  const [selectedTxid, setSelectedTxid] = useState<string>(
    txid || (positions.length === 1 ? positions[0].txid : ''),
  );
  const selected = positions.find(b => b.txid === selectedTxid);
  const withdrawing = selected?.status === WalletBondsStatusEnum.Unbonding;

  const select = useCallback(
    (bond: WalletBondsType) => setSelectedTxid(bond.txid),
    [],
  );

  const submit = () => {
    if (!selected) {
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
      kind: withdrawing
        ? StakingActionKindEnum.WithdrawBond
        : StakingActionKindEnum.BeginUnbonding,
      amount: (bondTransfer(selected, transfers)?.amount || 0) * 10 ** 8,
      finalizer: selected.finalizer,
      finalizerTo: '',
      txid: selected.txid,
      bondKey: '',
    };
    navigation.navigate(RouteEnum.ScheduledActionDetail, { item });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: WalletBondsType; index: number }) => (
      <StakingPositionRow
        testID={`unstake-position-${index + 1}`}
        bond={item}
        privacy={privacy}
        last={index === positions.length - 1}
        selected={item.txid === selectedTxid}
        onSelect={select}
      />
    ),
    [privacy, positions.length, selectedTxid, select],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <HeaderTitle
        title="Unstake"
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
        ListHeaderComponent={
          <Text
            style={[text.footnote, styles.section, { color: colors.fgSubtle }]}
          >
            Choose a position
          </Text>
        }
        ListEmptyComponent={
          <Text
            style={[text.footnote, styles.empty, { color: colors.fgSubtle }]}
          >
            Nothing to unstake.
          </Text>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
      >
        <LiquidPrimaryButton
          title={withdrawing ? 'Withdraw' : 'Unstake'}
          disabled={!selected}
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
  section: {
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingTop: space.sm,
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

export default Unstake;
