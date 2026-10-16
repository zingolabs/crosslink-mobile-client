/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import moment from 'moment';
import { Eye, EyeOff, QrCode, Send } from 'lucide-react-native';

import { ValueTransferType } from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { useTheme } from '../../app/theme';
import { Sparkline } from './charts';
import {
  VariantActions,
  formatFiat,
  tabular,
  usePrivacy,
  useTransfers,
} from './shared';
import {
  ActivityList,
  CARD,
  HAIRLINE,
  Inspector,
  PillButton,
  t,
} from './parts';
import {
  FlowBars,
  FlowStats,
  NetworkModule,
  PendingList,
  PoolLegend,
  PrivacyGauge,
  ShieldPrompt,
  SpendableHeader,
  StakingSummary,
  monthTotals,
  usePrice,
  weeklyFlows,
} from './modules';

const W = 1194;
const SIDE = 400;
const GRID = W - SIDE;
const PAD = 24;
const GAP = 16;
const TILE = (GRID - PAD * 2 - GAP) / 2;

const Tile: React.FC<{
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ title, children, right }) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: TILE,
        backgroundColor: CARD,
        borderRadius: 22,
        padding: 20,
      }}
    >
      <View
        style={[t.row, { justifyContent: 'space-between', marginBottom: 14 }]}
      >
        <Text
          style={[t.footnote, { color: colors.fgSubtle, fontWeight: '600' }]}
        >
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
};

const Glance: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
  onShield,
}) => {
  const { colors } = useTheme();
  const { info } = useContext(ContextAppLoaded);
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const [selected, setSelected] = useState<string | null>(null);
  const current = transfers.find(vt => vt.txid === selected) ?? null;
  const onSelect = useCallback(
    (vt: ValueTransferType) => setSelected(vt.txid),
    [],
  );
  const close = useCallback(() => setSelected(null), []);

  const month = monthTotals(transfers);
  const weeks = useMemo(() => weeklyFlows(transfers, 6), [transfers]);
  const price = usePrice(30);
  const up = price.change >= 0;

  const col = (children: React.ReactNode) => (
    <View style={{ gap: GAP }}>{children}</View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
      <ScrollView
        style={{ width: GRID }}
        contentContainerStyle={{
          paddingTop: insetTop + 4,
          paddingHorizontal: PAD,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[t.row, { justifyContent: 'space-between', marginBottom: 16 }]}
        >
          <Text style={[t.title1, { color: colors.fgDefault }]}>Summary</Text>
          <Pressable
            onPress={toggle}
            accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
            style={({ pressed }) => [
              t.row,
              {
                height: 34,
                paddingHorizontal: 14,
                borderRadius: 17,
                backgroundColor: pressed ? '#2c2c2e' : '#1c1c1e',
              },
            ]}
          >
            {hidden ? (
              <EyeOff size={15} color={colors.fgMuted} strokeWidth={2} />
            ) : (
              <Eye size={15} color={colors.fgMuted} strokeWidth={2} />
            )}
            <Text
              style={[t.footnote, { color: colors.fgMuted, fontWeight: '500' }]}
            >
              {hidden ? 'Amounts hidden' : 'Hide amounts'}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: GAP }}>
          {col(
            <>
              <Tile title="Wallet">
                <SpendableHeader hidden={hidden} size={34} />
                <View style={[t.row, { gap: 10, marginTop: 20 }]}>
                  <PillButton
                    tone="primary"
                    label="Send"
                    height={40}
                    onPress={onSend}
                    style={{ flex: 1 }}
                    icon={<Send size={15} color="#fff" strokeWidth={2.2} />}
                  />
                  <PillButton
                    label="Receive"
                    height={40}
                    onPress={onReceive}
                    style={{ flex: 1 }}
                    icon={
                      <QrCode
                        size={15}
                        color={colors.fgDefault}
                        strokeWidth={2.2}
                      />
                    }
                  />
                </View>
              </Tile>
              <Tile
                title={`${info.currencyName || 'ZEC'} price, 30 days`}
                right={
                  <Text
                    style={[
                      t.footnote,
                      tabular,
                      {
                        color: up ? colors.fgSuccess : colors.fgDanger,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {up ? '+' : '−'}
                    {(Math.abs(price.change) * 100).toFixed(1)}%
                  </Text>
                }
              >
                <Text
                  style={[
                    tabular,
                    {
                      color: colors.fgDefault,
                      fontSize: 28,
                      fontWeight: '600',
                      letterSpacing: -0.5,
                    },
                  ]}
                >
                  {formatFiat(price.now)}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <Sparkline
                    data={price.series}
                    width={TILE - 40}
                    height={64}
                    color={up ? colors.fgSuccess : colors.fgDanger}
                  />
                </View>
              </Tile>
              <Tile title="Network">
                <NetworkModule />
                <View style={{ marginTop: 14 }}>
                  <PendingList
                    transfers={transfers}
                    hidden={hidden}
                    onOpen={onSelect}
                  />
                </View>
              </Tile>
            </>,
          )}
          {col(
            <>
              <Tile title="Privacy">
                <View style={[t.row, { gap: 16 }]}>
                  <PrivacyGauge size={108} hidden={hidden} />
                  <View style={{ flex: 1 }}>
                    <PoolLegend hidden={hidden} notes={false} />
                  </View>
                </View>
                <View style={{ marginTop: 14 }}>
                  <ShieldPrompt hidden={hidden} onShield={onShield} compact />
                </View>
              </Tile>
              <Tile title="Staking">
                <StakingSummary hidden={hidden} />
              </Tile>
              <Tile title={`${moment().format('MMMM')} so far`}>
                <FlowStats
                  inflow={month.inflow}
                  outflow={month.outflow}
                  hidden={hidden}
                  size={17}
                />
                <View style={{ marginTop: 14 }}>
                  <FlowBars
                    data={weeks}
                    width={TILE - 40}
                    height={64}
                    hidden={hidden}
                  />
                </View>
              </Tile>
            </>,
          )}
        </View>
      </ScrollView>

      <View
        style={{
          width: SIDE,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderLeftColor: HAIRLINE,
          backgroundColor: '#0e0e0f',
        }}
      >
        <ActivityList
          transfers={transfers}
          hidden={hidden}
          width={SIDE}
          selected={selected}
          onSelect={onSelect}
          paddingTop={insetTop}
          title="Activity"
          showFilter={false}
          autoSelect={false}
        />
        <Inspector
          vt={current}
          hidden={hidden}
          width={SIDE}
          top={24}
          onClose={close}
        />
      </View>
    </View>
  );
};

export default Glance;
