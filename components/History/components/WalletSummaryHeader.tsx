import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isEqual } from 'lodash';

import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../../app/context';
import { RouteEnum, SelectServerEnum } from '../../../app/AppState';
import { RPCSyncStatusType } from '../../../app/wallet/types/RPCSyncStatusType';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { space, text, useTheme } from '../../../app/theme';

type WalletSummaryHeaderProps = {
  show_staked: boolean;
};

const WalletSummaryHeader: React.FC<WalletSummaryHeaderProps> = ({
  show_staked = false,
}) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();

  const { translate } = useAppLoadedActions();
  const { selectIndexerServer, privacy } = useAppLoadedSettings();
  const { totalBalance, info, syncingStatus, netInfo } = useAppLoadedWallet();

  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Compute sync percentage
  useEffect(() => {
    const percentage: number =
      syncingStatus.percentage_total_outputs_scanned ||
      syncingStatus.percentage_total_blocks_scanned ||
      0;
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      percentage === 0
    ) {
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      const raw = percentage ?? 0;
      const clamped =
        raw < 0.01
          ? 0.01
          : raw > 99.99
            ? 99.99
            : Number(raw.toFixed(2).replace(/\.?0+$/, ''));

      setPercentageOutputsScanned(clamped);
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
          syncingStatus.scan_ranges.length > 0 &&
          raw < 100,
      );
    }
  }, [syncingStatus]);

  // Blinking animation when syncing
  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    if (syncInProgress) {
      animationRef.current?.start();
    } else {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    };
  }, [syncInProgress, opacityValue]);

  const showSyncReport = () => {
    navigation.navigate(RouteEnum.SyncReport);
  };

  const balanceTotal = show_staked
    ? (totalBalance?.stakedAmount ?? 0)
    : (totalBalance?.totalSpendableBalance ?? 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      {/* Balance */}
      <View style={styles.balanceRow}>
        <ZecAmount
          currencyName={info.currencyName}
          color={colors.fgDefault}
          size={36}
          amtZec={balanceTotal}
          privacy={privacy}
          smallPrefix
        />
      </View>

      {/* Sync bar */}
      <View style={styles.syncBar}>
        {netInfo.isConnected && percentageOutputsScanned > 0 ? (
          <>
            <View style={[styles.bar, { backgroundColor: colors.bgSurface }]} />
            <View
              style={[
                styles.barFill,
                {
                  width: `${percentageOutputsScanned}%`,
                  backgroundColor: colors.fgSuccess,
                },
              ]}
            />
          </>
        ) : netInfo.isConnected ? (
          <View style={[styles.bar, { backgroundColor: colors.bgSyncing }]} />
        ) : null}
      </View>

      {/* Sync status chip */}
      <View style={styles.chipRow}>
        {selectIndexerServer === SelectServerEnum.offline ? (
          <View style={[styles.chip, { borderColor: colors.borderMuted }]}>
            <FadeText style={text.caption2}>
              {translate('settings.server-offline') as string}
            </FadeText>
          </View>
        ) : netInfo.isConnected && percentageOutputsScanned > 0 ? (
          <>
            {syncInProgress ? (
              <View style={styles.chipBox}>
                <Animated.View
                  style={[styles.blink, { opacity: opacityValue }]}
                >
                  <View style={styles.rowCenter}>
                    <FadeText style={styles.chipText}>
                      {translate('syncing') as string}
                    </FadeText>
                    {percentageOutputsScanned > 0 && (
                      <>
                        <FadeText style={styles.chipText}>{' - '}</FadeText>
                        <FadeText style={styles.chipText}>
                          {` ${percentageOutputsScanned}%`}
                        </FadeText>
                      </>
                    )}
                  </View>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.chipBox}>
                <View style={styles.blink}>
                  <FadeText style={styles.chipText}>
                    {translate('synced') as string}
                  </FadeText>
                </View>
              </View>
            )}
          </>
        ) : netInfo.isConnected ? (
          <View style={styles.chipBox}>
            <TouchableOpacity onPress={showSyncReport}>
              <View style={styles.blink}>
                <FadeText style={styles.chipText}>
                  {translate('connecting') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  syncBar: {
    width: '30%',
    height: 5,
    marginTop: space.md,
    borderRadius: 3,
    alignSelf: 'center',
  },
  bar: {
    height: 5,
    width: '100%',
    borderRadius: 3,
  },
  barFill: {
    height: 5,
    borderRadius: 3,
    marginTop: -5,
  },
  chipRow: {
    marginTop: space.sm,
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2.5,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 25,
    minHeight: 25,
  },
  chipBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2.5,
    padding: 1,
    minWidth: 25,
    minHeight: 25,
  },
  blink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    ...text.caption2,
    marginLeft: 2,
  },
});

export default WalletSummaryHeader;
