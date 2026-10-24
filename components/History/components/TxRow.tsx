import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSAnimationProperties,
  CSSTransitionProperties,
  Easing,
  FadeIn,
  FadeInDown,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import moment from 'moment';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Hourglass,
  Lock,
  LockOpen,
  Repeat,
  ShieldCheck,
  Shuffle,
  StickyNote,
  Undo2,
} from 'lucide-react-native';

import {
  ValueTransferKindEnum as K,
  ValueTransferType,
} from '../../../app/AppState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
} from '../../../app/context';
import { text, curve, duration, useTheme } from '../../../app/theme';
import Utils from '../../../app/utils';
import JellyLoader from '../../Components/Icons/JellyLoader';
import { formatBalance } from '../../Components/SummaryPanel';

export const TX_ROW_HEIGHT = 60;

const EASE_OUT = Easing.bezier(curve[0], curve[1], curve[2], curve[3]);
const CSS_EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);

export const isIncoming = (vt: ValueTransferType) =>
  vt.kind === K.Received || vt.kind === K.WithdrawBond;

const isOutgoing = (vt: ValueTransferType) =>
  vt.kind === K.Sent || vt.kind === K.CreateBond;

export const isPendingTx = (vt: ValueTransferType) => vt.confirmations === 0;

export const KindIcon: React.FC<{
  vt: ValueTransferType;
  color: string;
  size?: number;
}> = ({ vt, color, size = 18 }) => {
  const props = { size, color, strokeWidth: 2 };
  switch (vt.kind) {
    case K.Received:
      return <ArrowDownLeft {...props} />;
    case K.Sent:
      return <ArrowUpRight {...props} />;
    case K.Shield:
      return <ShieldCheck {...props} />;
    case K.MemoToSelf:
      return <StickyNote {...props} />;
    case K.SendToSelf:
      return <Repeat {...props} />;
    case K.CreateBond:
      return <Lock {...props} />;
    case K.BeginUnbond:
      return <Hourglass {...props} />;
    case K.WithdrawBond:
      return <LockOpen {...props} />;
    case K.RetargetDelegationBond:
      return <Shuffle {...props} />;
    default:
      return <Undo2 {...props} />;
  }
};

const ENTER = FadeInDown.duration(duration.enter)
  .easing(EASE_OUT)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: -10 }, { scale: 0.98 }],
  });
const ENTER_STILL = FadeIn.duration(200);

type TxRowProps = {
  vt: ValueTransferType;
  fresh: boolean;
  last: boolean;
  onPress: (vt: ValueTransferType) => void;
  testID?: string;
};

/**
 * One transaction: kind icon, what happened, when, how much. A pending row
 * shows the loader where the time goes. A row that arrived after the list
 * was already on screen settles in from above and tints briefly.
 */
const TxRow: React.FC<TxRowProps> = ({ vt, fresh, last, onPress, testID }) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const { translate } = useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const [pressed, setPressed] = useState(false);

  const pending = isPendingTx(vt);
  const incoming = isIncoming(vt);
  const sign = incoming ? '+' : isOutgoing(vt) ? '−' : '';
  const amount = privacy ? '••••' : `${sign}${formatBalance(vt.amount)}`;
  const label = Utils.valueTransferKindText(translate, vt);

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  };
  const highlight: CSSAnimationProperties = useMemo(
    () => ({
      animationName: {
        from: { backgroundColor: colors.bgAccentTint },
        '35%': { backgroundColor: colors.bgAccentTint },
        to: { backgroundColor: 'transparent' },
      },
      animationDuration: duration.highlight,
      animationTimingFunction: 'ease-out',
      animationFillMode: 'both',
    }),
    [colors.bgAccentTint],
  );

  return (
    <Animated.View
      entering={fresh ? (reduced ? ENTER_STILL : ENTER) : undefined}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${amount} ${pending ? '' : moment(vt.time * 1000).format('H:mm')}`}
        onPress={() => onPress(vt)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        pressRetentionOffset={16}
      >
        <Animated.View
          style={[
            styles.row,
            pressed
              ? [styles.rowIdle, { backgroundColor: colors.bgPress }]
              : styles.rowIdle,
            press,
            fresh && highlight,
          ]}
        >
          <View style={[styles.disc, { backgroundColor: colors.bgSurface }]}>
            <KindIcon vt={vt} color={colors.fgDefault} />
          </View>
          <View style={styles.body}>
            <Text
              numberOfLines={1}
              style={[text.body, { color: colors.fgDefault }]}
            >
              {label}
            </Text>
            {pending ? (
              <View style={styles.loader}>
                <JellyLoader size={18} color={colors.fgSubtle} />
              </View>
            ) : (
              <Text style={[text.footnote, { color: colors.fgSubtle }]}>
                {moment(vt.time * 1000).format('H:mm')}
              </Text>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[
              text.numeral,
              { color: incoming ? colors.fgSuccess : colors.fgDefault },
            ]}
          >
            {amount}
          </Text>
        </Animated.View>
        {!last && (
          <View
            style={[styles.hairline, { backgroundColor: colors.borderFaint }]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: TX_ROW_HEIGHT,
    paddingHorizontal: 20,
  },
  rowIdle: {
    backgroundColor: 'transparent',
  },
  disc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  loader: {
    height: 18,
    justifyContent: 'center',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
});

export default React.memo(TxRow);
