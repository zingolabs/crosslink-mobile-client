import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  ScreenEnum,
} from '../../../app/AppState';

import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../../app/context';
import { RPCValueTransferStatusEnum } from '../../../app/wallet/enums/RPCValueTransferStatusEnum';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import Stake from '../../../assets/icons/stake-blue.svg';
import Unstake from '../../../assets/icons/unstake-yellow.svg';
import {
  curve,
  duration,
  radiusCard,
  space,
  text,
  useTheme,
} from '../../../app/theme';

const EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  nextLineWithSameTxid: boolean;
  //setMessagesAddressModalShow: (vt: ValueTransferType) => void;
  addressProtected?: boolean;
  screenName: ScreenEnum;
  registerSwipeable: (r: Swipeable) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  closeAllSwipeables,
}) => {
  const { translate } = useAppLoadedActions();
  const { language, privacy } = useAppLoadedSettings();
  const { info } = useAppLoadedWallet();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  const amountColor = Utils.valueTransferKindColor(colors.fgDefault, vt);

  const icon =
    vt.kind === ValueTransferKindEnum.Received ||
    vt.kind === ValueTransferKindEnum.Shield ||
    vt.kind === ValueTransferKindEnum.WithdrawBond
      ? faArrowDown
      : faArrowUp;

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  return (
    <View testID={`vt-${index + 1}`} style={styles.line}>
      {month !== '' && (
        <View style={[styles.monthHeader, { backgroundColor: colors.bgFaint }]}>
          <RegText>Activity</RegText>
          <FadeText>Transactions</FadeText>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          closeAllSwipeables();
          await new Promise(r => requestAnimationFrame(r));
          setValueTransferDetailModalShow(index, vt);
        }}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <Animated.View
          style={[
            styles.row,
            pressed
              ? { backgroundColor: colors.bgPress }
              : { backgroundColor: colors.bgSurface },
            press,
          ]}
        >
          <View
            style={[styles.rowBody, { borderBottomColor: colors.borderFaint }]}
          >
            <View style={styles.rowHead}>
              <View style={styles.iconBox}>
                {vt.confirmations >= 0 &&
                vt.confirmations < GlobalConst.minConfirmations ? (
                  <FontAwesomeIcon
                    style={styles.rot45}
                    size={20}
                    icon={faRefresh}
                    color={amountColor}
                  />
                ) : (
                  <>
                    {vt.kind === ValueTransferKindEnum.CreateBond ? (
                      <Stake width={20} height={20} />
                    ) : vt.kind === ValueTransferKindEnum.BeginUnbond ||
                      vt.kind ===
                        ValueTransferKindEnum.RetargetDelegationBond ? (
                      <Unstake width={20} height={20} />
                    ) : (
                      <FontAwesomeIcon
                        style={styles.rot45}
                        size={20}
                        icon={icon}
                        color={amountColor}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={styles.rowMain}>
                <View style={styles.rowMainCol}>
                  <FadeText style={text.headline}>
                    {Utils.valueTransferKindText(translate, vt)}
                  </FadeText>

                  {!!vt.address && (
                    <View>
                      <RegText>{`to: ${Utils.trimToSmall(vt.address, 8)}`}</RegText>
                    </View>
                  )}

                  <View style={styles.whenRow}>
                    <FadeText>2026</FadeText>
                    {vt.confirmations === 0 && (
                      <View style={styles.statusRow}>
                        <FadeText
                          style={{
                            ...text.caption1,
                            ...styles.statusLabel,
                            color:
                              vt.status ===
                                RPCValueTransferStatusEnum.transmitted ||
                              vt.status ===
                                RPCValueTransferStatusEnum.calculated ||
                              vt.status ===
                                RPCValueTransferStatusEnum.mempool ||
                              vt.status === RPCValueTransferStatusEnum.failed
                                ? colors.fgAccent
                                : colors.fgAccentDisabled,
                          }}
                        >
                          {translate(`history.${vt.status}`) as string}
                        </FadeText>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <ZecAmount
                style={styles.amount}
                size={18}
                currencyName={info.currencyName}
                color={amountColor}
                amtZec={
                  vt.kind === ValueTransferKindEnum.Received ||
                  vt.kind === ValueTransferKindEnum.Shield ||
                  vt.kind === ValueTransferKindEnum.WithdrawBond
                    ? vt.amount
                    : Number(
                          Utils.splitZecAmountIntoBigSmall(vt.amount).bigPart,
                        ) === 0
                      ? vt.amount
                      : vt.amount * -1
                }
                privacy={privacy}
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  line: {
    display: 'flex',
    flexDirection: 'column',
    marginHorizontal: space.md,
  },
  monthHeader: {
    marginTop: space.xl,
    borderTopLeftRadius: radiusCard,
    borderTopRightRadius: radiusCard,
    paddingVertical: space.md,
    paddingHorizontal: space.xxl,
  },
  row: {
    zIndex: 999,
    paddingHorizontal: space.xs,
  },
  rowBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: space.md,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'solid',
  },
  rowHead: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBox: {
    display: 'flex',
    marginHorizontal: space.xs,
  },
  rowMain: {
    display: 'flex',
  },
  rowMainCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  whenRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    marginLeft: space.md,
  },
  amount: {
    flexGrow: 1,
    alignSelf: 'auto',
    justifyContent: 'flex-end',
    paddingRight: space.xs,
  },
  rot45: {
    transform: [{ rotate: '45deg' }],
  },
});

export default React.memo(ValueTransferLine);
