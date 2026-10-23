/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import moment from 'moment';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  QrCode,
  Send,
} from 'lucide-react-native';

import { useTheme } from '../../app/theme';
import { VariantActions, at, usePrivacy, useTransfers } from './shared';
import {
  ActivityList,
  HAIRLINE,
  PillButton,
  TxDetail,
  t,
  useSelection,
} from './parts';
import {
  FlowBars,
  FlowStats,
  Recipients,
  SpendableHeader,
  monthTotals,
  monthWeeks,
} from './modules';

const W = 1194;
const LIST = 520;
const PAD = 24;

const Month: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
}) => {
  const { colors } = useTheme();
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const [month, setMonth] = useState(() => moment().startOf('month'));

  const first = useMemo(
    () =>
      transfers.length
        ? at(transfers[transfers.length - 1]).startOf('month')
        : moment().startOf('month'),
    [transfers],
  );
  const isCurrent = month.isSame(moment(), 'month');
  const canBack = month.isAfter(first, 'month');

  const inMonth = useMemo(
    () => transfers.filter(vt => at(vt).isSame(month, 'month')),
    [transfers, month],
  );
  const totals = monthTotals(transfers, month);
  const weeks = useMemo(() => monthWeeks(transfers, month), [transfers, month]);
  const { selected, current, onSelect } = useSelection(inMonth);

  const nav = (dir: -1 | 1, enabled: boolean) => (
    <Pressable
      disabled={!enabled}
      onPress={() => setMonth(m => m.clone().add(dir, 'month'))}
      accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? '#2c2c2e' : '#1c1c1e',
        opacity: enabled ? 1 : 0.35,
      })}
    >
      {dir < 0 ? (
        <ChevronLeft size={18} color={colors.fgDefault} strokeWidth={2.4} />
      ) : (
        <ChevronRight size={18} color={colors.fgDefault} strokeWidth={2.4} />
      )}
    </Pressable>
  );

  const block = (label: string, children: React.ReactNode, width: number) => (
    <View style={{ width }}>
      <Text
        style={[
          t.footnote,
          { color: colors.fgSubtle, fontWeight: '600', marginBottom: 10 },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );

  const colW = (W - PAD * 2 - 48 * 2) / 3;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={{
          paddingTop: insetTop,
          paddingHorizontal: PAD,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: insetTop + 52,
        }}
      >
        <View style={[t.row, { gap: 12 }]}>
          {nav(-1, canBack)}
          <Text style={[t.title1, { color: colors.fgDefault, minWidth: 230 }]}>
            {month.format('MMMM')}
            <Text style={{ color: colors.fgSubtle, fontWeight: '400' }}>
              {' '}
              {month.format('YYYY')}
            </Text>
          </Text>
          {nav(1, !isCurrent)}
        </View>
        <View style={[t.row, { gap: 12 }]}>
          <Pressable
            onPress={toggle}
            accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#2c2c2e' : '#1c1c1e',
            })}
          >
            {hidden ? (
              <EyeOff size={18} color={colors.fgMuted} strokeWidth={2} />
            ) : (
              <Eye size={18} color={colors.fgMuted} strokeWidth={2} />
            )}
          </Pressable>
          <PillButton
            label="Receive"
            height={40}
            onPress={onReceive}
            icon={
              <QrCode size={16} color={colors.fgDefault} strokeWidth={2.2} />
            }
          />
          <PillButton
            tone="primary"
            label="Send"
            height={40}
            onPress={onSend}
            icon={<Send size={16} color="#fff" strokeWidth={2.2} />}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 48,
          paddingHorizontal: PAD,
          paddingTop: 16,
          paddingBottom: 20,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: HAIRLINE,
        }}
      >
        {block('Wallet', <SpendableHeader hidden={hidden} size={30} />, colW)}
        {block(
          isCurrent ? `${month.format('MMMM')} so far` : month.format('MMMM'),
          <View style={{ gap: 14 }}>
            <FlowStats
              inflow={totals.inflow}
              outflow={totals.outflow}
              hidden={hidden}
              size={18}
            />
            <FlowBars data={weeks} width={colW} height={72} hidden={hidden} />
          </View>,
          colW,
        )}
        {block(
          'Paid this month',
          <Recipients
            transfers={transfers}
            month={month}
            onSend={onSend}
            hidden={hidden}
          />,
          colW,
        )}
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View
          style={{
            width: LIST,
            paddingTop: 16,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderRightColor: HAIRLINE,
          }}
        >
          <ActivityList
            key={month.format('YYYY-MM')}
            transfers={inMonth}
            hidden={hidden}
            width={LIST}
            selected={selected}
            onSelect={onSelect}
            title="Transactions"
          />
        </View>
        <View style={{ flex: 1 }}>
          {current ? (
            <TxDetail key={current.txid} vt={current} hidden={hidden} compact />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[t.subheadline, { color: colors.fgSubtle }]}>
                No transactions in {month.format('MMMM')}.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default Month;
