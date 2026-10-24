import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { formatAmount } from '../../../app/utils/Utils';
import {
  radiusCard,
  radiusPill,
  space,
  text,
  mono,
  useTheme,
} from '../../../app/theme';

export default interface WalletBondsType {
  txid: string;
  pubKey: string;
  amount: number;
  status: WalletBondsStatusEnum;
  finalizer: string;
}

type WalletBondCardProps = {
  bond: WalletBondsType;
  dateLabel?: string;
  onPressRedelegate: (bond: WalletBondsType) => void;
  onPressUnstake: (bond: WalletBondsType) => void;
  onPresWithdraw: (bond: WalletBondsType) => void;

  containerStyle?: StyleProp<ViewStyle>;
  statusTextStyle?: StyleProp<TextStyle>;
  dateTextStyle?: StyleProp<TextStyle>;
  pubKeyTextStyle?: StyleProp<TextStyle>;
  innerCardStyle?: StyleProp<ViewStyle>;
  amountTextStyle?: StyleProp<TextStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  actionButtonTextStyle?: StyleProp<TextStyle>;
  primaryButtonStyle?: StyleProp<ViewStyle>;
  secondaryButtonStyle?: StyleProp<ViewStyle>;
};

function truncateMiddle(value: string, start = 10, end = 8) {
  if (!value) return '';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function FinalizerPosition({
  bond,
  dateLabel = '',
  onPressRedelegate,
  onPressUnstake,
  onPresWithdraw,
  containerStyle,
  statusTextStyle,
  dateTextStyle,
  pubKeyTextStyle,
  innerCardStyle,
  amountTextStyle,
  actionButtonStyle,
  actionButtonTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
}: WalletBondCardProps) {
  const { colors } = useTheme();
  const isActive = bond.status === WalletBondsStatusEnum.Active;
  const statusColor = isActive ? colors.fgSuccess : colors.fgSubtle;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgSurface },
        containerStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text
            style={[text.headline, statusTextStyle, { color: statusColor }]}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>

        <Text
          style={[text.subheadline, { color: colors.fgSubtle }, dateTextStyle]}
        >
          {dateLabel}
        </Text>
      </View>

      <Text
        style={[
          mono,
          styles.pubKeyText,
          { color: colors.fgMuted },
          pubKeyTextStyle,
        ]}
      >
        {truncateMiddle(bond.pubKey)}
      </Text>

      <View
        style={[
          styles.innerCard,
          {
            borderColor: colors.borderFaint,
            backgroundColor: colors.bgFaint,
          },
          innerCardStyle,
        ]}
      >
        <Text
          style={[
            text.numeral,
            styles.amountText,
            { color: colors.fgDefault },
            amountTextStyle,
          ]}
        >
          {formatAmount(bond.amount)}
        </Text>

        <View style={styles.actionsRow}>
          {isActive && (
            <>
              <Pressable
                onPress={() => onPressRedelegate?.(bond)}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.bgFaint },
                  secondaryButtonStyle,
                  actionButtonStyle,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    text.headline,
                    { color: colors.fgDefault },
                    actionButtonTextStyle,
                  ]}
                >
                  Redelegate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onPressUnstake?.(bond)}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.bgAccent },
                  primaryButtonStyle,
                  actionButtonStyle,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    text.headline,
                    { color: colors.fgDefault },
                    actionButtonTextStyle,
                  ]}
                >
                  Unstake
                </Text>
              </Pressable>
            </>
          )}

          {!isActive && (
            <Pressable
              onPress={() => onPresWithdraw?.(bond)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.bgAccent },
                primaryButtonStyle,
                actionButtonStyle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  text.headline,
                  { color: colors.fgDefault },
                  actionButtonTextStyle,
                ]}
              >
                Withdraw
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    borderRadius: radiusCard,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: space.md,
  },

  pubKeyText: {
    marginBottom: space.lg,
  },

  innerCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },

  amountText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
  },

  actionButton: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.8,
  },
});
