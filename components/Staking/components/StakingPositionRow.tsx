import React, { useState } from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import ContextMenu, {
  ContextMenuOnPressNativeEvent,
} from 'react-native-context-menu-view';
import { Check } from 'lucide-react-native';

import { WalletBondsType } from '../../../app/AppState';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { curve, duration, text, useTheme } from '../../../app/theme';
import Utils from '../../../app/utils';
import LifehashDisc from '../../Components/LifehashDisc';
import { formatBalance } from '../../Components/SummaryPanel';

export const POSITION_ROW_HEIGHT = 60;

const CSS_EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);
const MASK = '••••';

export type PositionAction = 'redelegate' | 'unstake' | 'withdraw';

type MenuAction = {
  key: PositionAction;
  title: string;
  systemIcon: string;
};

const ACTIVE_ACTIONS: MenuAction[] = [
  { key: 'redelegate', title: 'Redelegate', systemIcon: 'arrow.triangle.swap' },
  { key: 'unstake', title: 'Unstake', systemIcon: 'hourglass' },
];

const UNBONDING_ACTIONS: MenuAction[] = [
  { key: 'withdraw', title: 'Withdraw', systemIcon: 'lock.open' },
];

type StakingPositionRowProps = {
  bond: WalletBondsType;
  privacy: boolean;
  last: boolean;
  onAction?: (action: PositionAction, bond: WalletBondsType) => void;
  onSelect?: (bond: WalletBondsType) => void;
  selected?: boolean;
  testID?: string;
};

const StakingPositionRow: React.FC<StakingPositionRowProps> = ({
  bond,
  privacy,
  last,
  onAction,
  onSelect,
  selected = false,
  testID,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const unbonding = bond.status === WalletBondsStatusEnum.Unbonding;
  const actions = unbonding ? UNBONDING_ACTIONS : ACTIVE_ACTIONS;
  const amount = privacy ? MASK : formatBalance(bond.amount);
  const status = unbonding ? 'Unbonding' : 'Staked';
  const label = Utils.trimToSmall(bond.finalizer, 6);

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  };
  const check: CSSTransitionProperties = {
    transitionProperty: ['opacity', 'transform'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  };

  const content = (
    <Animated.View
      style={[
        styles.row,
        pressed
          ? [styles.rowIdle, { backgroundColor: colors.bgPress }]
          : styles.rowIdle,
        press,
      ]}
    >
      <LifehashDisc finalizer={bond.finalizer} size={36} />
      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[text.body, { color: colors.fgDefault }]}
        >
          {label}
        </Text>
        <Text
          style={[
            text.footnote,
            { color: unbonding ? colors.fgWarning : colors.fgSubtle },
          ]}
        >
          {status}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={[text.numeral, { color: colors.fgDefault }]}
      >
        {amount}
      </Text>
      {onSelect && (
        <Animated.View
          style={[
            styles.check,
            check,
            selected ? styles.checkOn : styles.checkOff,
          ]}
        >
          <Check size={20} strokeWidth={2.5} color={colors.fgAccent} />
        </Animated.View>
      )}
    </Animated.View>
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={onSelect ? { selected } : undefined}
      accessibilityLabel={`${label}, ${status}, ${amount}`}
      onPress={onSelect ? () => onSelect(bond) : undefined}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
    >
      {onAction ? (
        <ContextMenu
          dropdownMenuMode
          actions={actions.map(a => ({
            title: a.title,
            systemIcon: a.systemIcon,
          }))}
          onPress={(e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) =>
            onAction(actions[e.nativeEvent.index].key, bond)
          }
        >
          {content}
        </ContextMenu>
      ) : (
        content
      )}
      {!last && (
        <View
          style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: POSITION_ROW_HEIGHT,
    paddingHorizontal: 10,
  },
  rowIdle: {
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
  },
  check: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  checkOff: {
    opacity: 0,
    transform: [{ scale: 0.9 }],
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});

export default React.memo(StakingPositionRow);
