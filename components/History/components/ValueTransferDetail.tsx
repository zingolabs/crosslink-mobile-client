/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';

import { useNavigation } from '@react-navigation/native';

import {
  SnackbarDurationEnum,
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import ZecAmount from '../../Components/ZecAmount';
import { LoadedAppStackParamList } from '../../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../../app/context';
import { KindIcon, isIncoming } from './TxRow';
import { Copy as CopyIcon } from 'lucide-react-native';
import { RPCValueTransferStatusEnum } from '../../../app/rpc/enums/RPCValueTransferStatusEnum';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../../Header';
import {
  curve,
  duration,
  mono,
  radiusCard,
  radiusPill,
  space,
  text,
  useTheme,
} from '../../../app/theme';

type ValueTransferDetailProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.ValueTransferDetail
>;

/**
 * A tappable area that answers the press with a quiet tint. Same
 * duration, curve and color as the rows on the home screen.
 */
const PressFeedback: React.FC<{
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}> = ({ onPress, accessibilityLabel, children }) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: cubicBezier(
      curve[0],
      curve[1],
      curve[2],
      curve[3],
    ),
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Animated.View
        style={[
          styles.feedbackBody,
          press,
          { backgroundColor: pressed ? colors.bgPress : 'transparent' },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

/** A value that can be copied, marked by a small glyph. */
const CopyValue: React.FC<{ children: string; monoFace?: boolean }> = ({
  children,
  monoFace,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.copyValue}>
      <Text
        numberOfLines={1}
        style={[
          monoFace ? styles.monoValue : styles.value,
          { color: colors.fgDefault },
        ]}
      >
        {children}
      </Text>
      <CopyIcon size={14} strokeWidth={2} color={colors.fgSubtle} />
    </View>
  );
};

const ValueTransferDetail: React.FunctionComponent<
  ValueTransferDetailProps
> = ({ route }) => {
  const navigation: any = useNavigation();
  const { translate, addLastSnackbar, removeFirstSnackbar } =
    useAppLoadedActions();
  const { language, privacy } = useAppLoadedSettings();
  const { info } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.ValueTransferDetail;

  const insets = useSafeAreaInsets();

  const [valueTransfer, setValueTransfer] = useState<ValueTransferType>(
    !!route.params && route.params.vt !== undefined
      ? route.params.vt
      : ({} as ValueTransferType),
  );
  const [totalLength, setTotalLength] = useState<number>(
    !!route.params && route.params.totalLength !== undefined
      ? route.params.totalLength
      : 0,
  );
  const [showNavigator, setShowNavigator] = useState<boolean>(true); // by default
  const isTheFirstMount = useRef(true);

  const memo = valueTransfer.memos;

  const pending =
    valueTransfer.confirmations >= 0 &&
    valueTransfer.confirmations < GlobalConst.minConfirmations;
  const incoming = isIncoming(valueTransfer);
  const accent = incoming ? colors.fgSuccess : colors.fgDefault;
  const kindLabel = Utils.valueTransferKindText(translate, valueTransfer);

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  useEffect(() => {
    const _vt =
      !!route.params && route.params.vt !== undefined
        ? route.params.vt
        : ({} as ValueTransferType);
    const _totalLength =
      !!route.params && route.params.totalLength !== undefined
        ? route.params.totalLength
        : 0;
    setValueTransfer(_vt);
    setTotalLength(_totalLength);
  }, [route, route.params, route.params?.vt, route.params?.totalLength]);

  // if the App is syncing, the VT list will change (new items).
  // Hide the navigator is the solution because the current index
  // will be associated to other item.
  useEffect(() => {
    if (isTheFirstMount.current) {
      isTheFirstMount.current = false;
      return;
    }
    if (showNavigator) {
      setShowNavigator(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalLength]);

  const copy = (value: string, message: string) => {
    Clipboard.setString(value);
    addLastSnackbar({
      message,
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };

  // The hero amount keeps the list's sign convention: money that arrived
  // reads positive, money that left reads negative.
  const amtZec =
    valueTransfer.kind === ValueTransferKindEnum.Received ||
    valueTransfer.kind === ValueTransferKindEnum.Shield ||
    valueTransfer.kind === ValueTransferKindEnum.WithdrawBond
      ? valueTransfer.amount
      : Number(
            Utils.splitZecAmountIntoBigSmall(valueTransfer.amount).bigPart,
          ) === 0
        ? valueTransfer.amount
        : valueTransfer.amount * -1;

  const pendingText =
    valueTransfer.status === RPCValueTransferStatusEnum.confirmed
      ? (translate(`history.${valueTransfer.status}`) as string) +
        ' - ' +
        (translate('history.waiting') as string) +
        ' (' +
        GlobalConst.minConfirmations.toString() +
        ')'
      : (translate(`history.${valueTransfer.status}`) as string) +
        ' - ' +
        (translate('history.not-confirmed') as string);

  type Row = {
    key: string;
    label: string;
    value: React.ReactNode;
    copyValue?: string;
    copyMessage?: string;
    monoFace?: boolean;
    last?: boolean;
  };

  const rows = useMemo(() => {
    const out: Row[] = [];
    const fee = valueTransfer.fee;
    const hasFee = !!fee && fee > 0;
    const lastOf = (key: string) => {
      if (key === 'fee') return true;
      if (key === 'pool') return !hasFee;
      if (key === 'block') return !hasFee && !valueTransfer.poolType;
      return false;
    };

    if (
      valueTransfer.kind === ValueTransferKindEnum.CreateBond ||
      valueTransfer.kind === ValueTransferKindEnum.RetargetDelegationBond
    ) {
      const target = valueTransfer.stakingAction?.target ?? '';
      out.push({
        key: 'target',
        label: 'Target',
        value: <CopyValue monoFace>{Utils.trimToSmall(target, 10)}</CopyValue>,
        copyValue: target,
        copyMessage: translate('history.addresscopied') as string,
      });
    }

    out.push({
      key: 'status',
      label: 'Status',
      value: (
        <Text style={[styles.value, { color: colors.fgDefault }]}>
          {valueTransfer.status}
        </Text>
      ),
    });
    out.push({
      key: 'confirmations',
      label: translate('history.confirmations') as string,
      value: (
        <Text style={[styles.value, { color: colors.fgDefault }]}>
          {valueTransfer.confirmations >= 0
            ? valueTransfer.confirmations.toString()
            : '-'}
        </Text>
      ),
    });

    if (valueTransfer.address) {
      out.push({
        key: 'address',
        label: 'Receiver',
        value: (
          <CopyValue monoFace>
            {Utils.trimToSmall(valueTransfer.address, 10)}
          </CopyValue>
        ),
        copyValue: valueTransfer.address,
        copyMessage: translate('history.addresscopied') as string,
      });
    }

    if (valueTransfer.txid) {
      out.push({
        key: 'txid',
        label: 'TXID',
        value: (
          <CopyValue monoFace>
            {Utils.trimToSmall(valueTransfer.txid, 10)}
          </CopyValue>
        ),
        copyValue: valueTransfer.txid,
        copyMessage: translate('history.txcopied') as string,
      });
    }

    out.push({
      key: 'time',
      label: translate('history.time') as string,
      value: (
        <Text style={[styles.value, { color: colors.fgDefault }]}>
          {valueTransfer.time
            ? moment(valueTransfer.time * 1000).format('LLL')
            : '--'}
        </Text>
      ),
    });

    out.push({
      key: 'block',
      label: 'Block height',
      value: (
        <Text style={[styles.value, { color: colors.fgDefault }]}>
          {valueTransfer.blockheight.toString()}
        </Text>
      ),
      last: lastOf('block'),
    });

    if (valueTransfer.poolType) {
      out.push({
        key: 'pool',
        label: 'Receiver type',
        value: (
          <Text style={[styles.value, { color: colors.fgDefault }]}>
            {valueTransfer.poolType}
          </Text>
        ),
        last: lastOf('pool'),
      });
    }

    if (hasFee) {
      out.push({
        key: 'fee',
        label: translate('history.txfee') as string,
        value: (
          <ZecAmount
            amtZec={
              valueTransfer.kind === ValueTransferKindEnum.CreateBond
                ? fee - valueTransfer.amount
                : fee
            }
            size={16}
            color={colors.fgDefault}
            currencyName={info.currencyName}
            privacy={privacy}
          />
        ),
        last: true,
      });
    }

    return out;
  }, [valueTransfer, colors.fgDefault, info.currencyName, privacy, translate]);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <HeaderTitle
          title="Transaction details"
          goBack={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + space.xl },
          ]}
        >
          <View style={styles.hero}>
            <View style={[styles.disc, { backgroundColor: colors.bgSurface }]}>
              <KindIcon vt={valueTransfer} color={accent} size={28} />
            </View>
            <ZecAmount
              currencyName={info.currencyName}
              size={48}
              amtZec={amtZec}
              color={accent}
              privacy={privacy}
              smallPrefix={true}
            />
            <Text style={[text.footnote, { color: colors.fgSubtle }]}>
              {kindLabel}
            </Text>
          </View>

          {pending && (
            <View
              style={[
                styles.pendingPill,
                {
                  backgroundColor: colors.bgWarning,
                  borderColor: colors.borderWarning,
                },
              ]}
            >
              <Text style={[styles.pendingText, { color: colors.fgWarning }]}>
                {pendingText}
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
            {rows.map(row => (
              <View key={row.key}>
                {row.copyValue ? (
                  <PressFeedback
                    accessibilityLabel={`Copy ${row.label}`}
                    onPress={() => copy(row.copyValue!, row.copyMessage ?? '')}
                  >
                    <View style={styles.row}>
                      <Text
                        style={[styles.rowLabel, { color: colors.fgMuted }]}
                      >
                        {row.label}
                      </Text>
                      <View style={styles.rowValue}>{row.value}</View>
                    </View>
                  </PressFeedback>
                ) : (
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: colors.fgMuted }]}>
                      {row.label}
                    </Text>
                    <View style={styles.rowValue}>{row.value}</View>
                  </View>
                )}
                {!row.last && (
                  <View
                    style={[
                      styles.hairline,
                      { backgroundColor: colors.borderFaint },
                    ]}
                  />
                )}
              </View>
            ))}

            {!!memo && (
              <View
                style={[styles.memo, { borderTopColor: colors.borderFaint }]}
              >
                <Text style={[styles.rowLabel, { color: colors.fgMuted }]}>
                  {translate('history.memo') as string}
                </Text>
                <PressFeedback
                  accessibilityLabel="Copy memo"
                  onPress={() =>
                    copy(
                      memo.join(' '),
                      translate('history.memocopied') as string,
                    )
                  }
                >
                  <View style={styles.memoBody}>
                    <Text
                      selectable={true}
                      style={[
                        styles.value,
                        styles.memoText,
                        { color: colors.fgDefault },
                      ]}
                    >
                      {memo.join(' ')}
                    </Text>
                  </View>
                </PressFeedback>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: space.sm,
    paddingHorizontal: space.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  disc: {
    width: 64,
    height: 64,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingPill: {
    alignSelf: 'center',
    borderRadius: radiusPill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginBottom: space.lg,
  },
  pendingText: {
    ...text.caption,
    fontWeight: '600',
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
  rowValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  value: {
    ...text.body,
    textAlign: 'right',
  },
  monoValue: {
    ...mono,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  copyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 1,
  },
  feedbackBody: {
    backgroundColor: 'transparent',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.lg,
  },
  memo: {
    marginTop: space.xs,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.xs,
  },
  memoBody: {
    borderRadius: space.sm,
    padding: space.xs,
  },
  memoText: {
    textAlign: 'left',
  },
});

export default ValueTransferDetail;
