import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';

import { RouteEnum, StakeType } from '../../app/AppState';
import { WalletBondsStatusEnum } from '../../app/AppState/enums/WalletBondsStatusEnum';
import { useSettings, useWalletData } from '../../app/store';
import { SessionStackParamList } from '../../app/types';
import { radiusPill, space, text, useTheme } from '../../app/theme';
import { HeaderTitle } from '../Header';
import StakingDayBubble from '../Staking/StakingDayBubble';
import FinalizerRow from '../Staking/Finalizers/FinalizerRow';
import { formatBalance } from '../Components/SummaryPanel';
import { positionsText } from '../Staking/components/StakingLists';

type FinalizersProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Finalizers
>;

const share = (part: number, whole: number) =>
  whole > 0 && part > 0 ? part / whole : 0;

const percentText = (fraction: number) => {
  const pct = fraction * 100;
  if (pct <= 0) {
    return '0%';
  }
  if (pct < 1) {
    return '<1%';
  }
  return `${pct >= 99 && pct < 100 ? 99 : Math.round(pct)}%`;
};

const Finalizers: React.FC<FinalizersProps> = ({ navigation, route }) => {
  const scope = route.params?.scope ?? 'network';
  const exclude = route.params?.exclude ?? '';

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { privacy } = useSettings();
  const { staked, globalStaked, walletBonds, info } = useWalletData();
  const [query, setQuery] = useState('');

  const base = scope === 'my' ? staked : globalStaked;
  const total = useMemo(
    () => base.reduce((sum, s) => sum + s.votingPower, 0),
    [base],
  );

  const finalizers: StakeType[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return base
      .filter(s => !!s.finalizer && s.finalizer !== exclude)
      .filter(s => !q || s.finalizer.toLowerCase().includes(q))
      .filter(s => (seen.has(s.finalizer) ? false : seen.add(s.finalizer)))
      .sort((a, b) => b.votingPower - a.votingPower);
  }, [base, exclude, query]);

  const positionsOf = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of walletBonds) {
      if (b.status !== WalletBondsStatusEnum.Withdrawn) {
        counts.set(b.finalizer, (counts.get(b.finalizer) ?? 0) + 1);
      }
    }
    return counts;
  }, [walletBonds]);

  const choose = useCallback(
    (finalizer: string) => {
      const stake = base.find(s => s.finalizer === finalizer);
      route.params?.setFinalizer?.(finalizer, stake?.votingPower ?? 0);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [base, navigation, route.params],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: StakeType; index: number }) => (
      <FinalizerRow
        testID={`pick-finalizer-${index + 1}`}
        stake={item}
        detail={
          scope === 'my'
            ? positionsText(positionsOf.get(item.finalizer) ?? 0)
            : `${percentText(share(item.votingPower, total))} of network · ${formatBalance(item.votingPower)} ${info.currencyName}`
        }
        share={scope === 'my' ? undefined : share(item.votingPower, total)}
        privacy={scope === 'my' && privacy}
        last={index === finalizers.length - 1}
        onPress={choose}
      />
    ),
    [
      scope,
      positionsOf,
      total,
      info.currencyName,
      privacy,
      finalizers.length,
      choose,
    ],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <HeaderTitle
        title="Choose finalizer"
        goBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        ExtraComponent={<StakingDayBubble />}
      />

      <View style={[styles.search, { backgroundColor: colors.bgSurface }]}>
        <Search size={18} strokeWidth={2} color={colors.fgSubtle} />
        <TextInput
          style={[text.body, styles.searchInput, { color: colors.fgDefault }]}
          placeholder="Search finalizer"
          placeholderTextColor={colors.fgSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search finalizer"
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <X size={18} strokeWidth={2} color={colors.fgSubtle} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={finalizers}
        keyExtractor={item => item.finalizer}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
        ListEmptyComponent={
          <Text
            style={[text.footnote, styles.empty, { color: colors.fgSubtle }]}
          >
            {query ? 'No finalizers match.' : 'No finalizers.'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    marginHorizontal: space.xl,
    marginTop: space.sm,
    marginBottom: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radiusPill,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 10,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: space.lg,
  },
});

export default Finalizers;
