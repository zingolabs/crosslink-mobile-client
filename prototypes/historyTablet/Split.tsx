/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Droplet, Lock, QrCode, Send } from 'lucide-react-native';

import { useAppLoadedWallet } from '../../app/context';
import { useTheme } from '../../app/theme';
import {
  MASK,
  VariantActions,
  formatFiat,
  formatZec,
  tabular,
  usePrivacy,
  useTransfers,
} from './shared';
import {
  ActivityList,
  BalanceFigure,
  HAIRLINE,
  HideToggle,
  PANEL,
  PillButton,
  SyncLine,
  TxDetail,
  t,
  useSelection,
} from './parts';

const SIDEBAR = 300;
const LIST = 498;

const Split: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
  onFaucet,
}) => {
  const { colors } = useTheme();
  const { totalBalance, zecPrice, info } = useAppLoadedWallet();
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const { selected, current, onSelect } = useSelection(transfers);
  const balance = totalBalance?.totalSpendableBalance ?? 0;

  return (
    <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
      <View
        style={{
          width: SIDEBAR,
          backgroundColor: PANEL,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: HAIRLINE,
          paddingTop: insetTop + 12,
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}
      >
        <Text style={[t.footnote, { color: colors.fgSubtle, marginBottom: 6 }]}>
          Spendable balance
        </Text>
        <BalanceFigure value={balance} hidden={hidden} rule />
        <Text
          style={[
            t.subheadline,
            tabular,
            { color: colors.fgMuted, marginTop: 12 },
          ]}
        >
          {hidden
            ? MASK
            : `≈ ${formatFiat(balance * (zecPrice?.zecPrice ?? 0))}`}
        </Text>

        <View style={{ marginTop: 24, gap: 12 }}>
          <View style={t.row}>
            <Lock size={14} color={colors.fgSubtle} strokeWidth={2.2} />
            <Text style={[t.footnote, tabular, { color: colors.fgMuted }]}>
              {hidden ? MASK : formatZec(totalBalance?.stakedAmount ?? 0)}{' '}
              {info.currencyName || 'ZEC'} staked
            </Text>
          </View>
          <SyncLine />
        </View>

        <View style={{ marginTop: 32, gap: 12 }}>
          <PillButton
            tone="primary"
            label="Send"
            onPress={onSend}
            icon={<Send size={16} color="#fff" strokeWidth={2.2} />}
          />
          <PillButton
            label="Receive"
            onPress={onReceive}
            icon={
              <QrCode size={16} color={colors.fgDefault} strokeWidth={2.2} />
            }
          />
          <PillButton
            tone="plain"
            label="Request from faucet"
            onPress={onFaucet}
            icon={
              <Droplet size={16} color={colors.fgMuted} strokeWidth={2.2} />
            }
          />
        </View>

        <View style={{ flex: 1 }} />
        <View
          style={{
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: HAIRLINE,
          }}
        >
          <HideToggle hidden={hidden} onToggle={toggle} />
        </View>
      </View>

      <View
        style={{
          width: LIST,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: HAIRLINE,
        }}
      >
        <ActivityList
          transfers={transfers}
          hidden={hidden}
          width={LIST}
          selected={selected}
          onSelect={onSelect}
          paddingTop={insetTop}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insetTop }}>
        {current ? (
          <TxDetail key={current.txid} vt={current} hidden={hidden} />
        ) : null}
      </View>
    </View>
  );
};

export default Split;
