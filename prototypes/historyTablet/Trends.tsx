/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock, QrCode, Send } from 'lucide-react-native';

import { ContextAppLoaded } from '../../app/context';
import { useTheme } from '../../app/theme';
import {
  MASK,
  VariantActions,
  formatZec,
  tabular,
  usePrivacy,
  useTransfers,
} from './shared';
import {
  ActivityList,
  HAIRLINE,
  HideToggle,
  PANEL,
  PillButton,
  SyncLine,
  TxDetail,
  t,
  useSelection,
} from './parts';
import { HoldingsChart, PriceChip, SpendableHeader } from './modules';

const W = 1194;
const SIDEBAR = 280;
const LIST = 460;
const MAIN = W - SIDEBAR;

const Trends: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
}) => {
  const { colors } = useTheme();
  const { totalBalance, info } = useContext(ContextAppLoaded);
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const { selected, current, onSelect } = useSelection(transfers);

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
        <SpendableHeader hidden={hidden} size={34} />
        <View style={{ marginTop: 20, gap: 12 }}>
          <View style={t.row}>
            <Lock size={14} color={colors.fgSubtle} strokeWidth={2.2} />
            <Text style={[t.footnote, tabular, { color: colors.fgMuted }]}>
              {hidden ? MASK : formatZec(totalBalance?.stakedAmount ?? 0)}{' '}
              {info.currencyName || 'ZEC'} staked
            </Text>
          </View>
          <SyncLine />
        </View>
        <View
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: HAIRLINE,
          }}
        >
          <PriceChip />
        </View>
        <View style={{ marginTop: 28, gap: 12 }}>
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

      <View style={{ width: MAIN, paddingTop: insetTop }}>
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: 20,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: HAIRLINE,
          }}
        >
          <HoldingsChart
            transfers={transfers}
            width={MAIN - 48}
            height={112}
            hidden={hidden}
          />
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
              transfers={transfers}
              hidden={hidden}
              width={LIST}
              selected={selected}
              onSelect={onSelect}
              showFilter={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            {current ? (
              <TxDetail
                key={current.txid}
                vt={current}
                hidden={hidden}
                compact
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

export default Trends;
