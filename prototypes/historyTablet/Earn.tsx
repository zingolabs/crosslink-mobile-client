/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Droplet, Plus, QrCode, Send } from 'lucide-react-native';

import { ValueTransferType } from '../../app/AppState';
import { useTheme } from '../../app/theme';
import {
  VariantActions,
  stakeBlue,
  useKeys,
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
} from './parts';
import {
  AllocationBar,
  FinalizerList,
  RewardBars,
  SpendableHeader,
  StakingSummary,
} from './modules';

const SIDEBAR = 300;
const LIST = 460;
const PANE = 1194 - SIDEBAR - LIST;

const Earn: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
  onFaucet,
  onStake,
}) => {
  const { colors } = useTheme();
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const [selected, setSelected] = useState<string | null>(null);
  const current = transfers.find(vt => vt.txid === selected) ?? null;
  const onSelect = useCallback(
    (vt: ValueTransferType) => setSelected(vt.txid),
    [],
  );

  useKeys(
    useCallback((e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
      }
    }, []),
  );

  const section = (label: string) => (
    <Text
      style={[
        t.footnote,
        { color: colors.fgSubtle, fontWeight: '600', marginBottom: 12 },
      ]}
    >
      {label}
    </Text>
  );

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
        <SpendableHeader hidden={hidden} size={36} />
        <View style={{ marginTop: 20 }}>
          <SyncLine />
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
          autoSelect={false}
        />
      </View>

      <View style={{ width: PANE, paddingTop: insetTop }}>
        {current ? (
          <>
            <Pressable
              onPress={() => setSelected(null)}
              style={({ pressed }) => [
                t.row,
                {
                  gap: 2,
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <ChevronLeft
                size={20}
                color={colors.fgAccent}
                strokeWidth={2.4}
              />
              <Text style={[t.subheadline, { color: colors.fgAccent }]}>
                Staking
              </Text>
            </Pressable>
            <TxDetail key={current.txid} vt={current} hidden={hidden} compact />
          </>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 4,
              paddingBottom: 40,
            }}
          >
            <Text style={[t.title1, { color: colors.fgDefault }]}>Staking</Text>
            <Text
              style={[
                t.footnote,
                { color: colors.fgSubtle, marginTop: 2, marginBottom: 20 },
              ]}
            >
              Rewards are paid when you unstake. Amounts here are estimates.
            </Text>
            <StakingSummary hidden={hidden} />
            <View style={{ marginTop: 24 }}>
              {section('Where your funds are')}
              <AllocationBar hidden={hidden} />
            </View>
            <View style={{ marginTop: 24 }}>
              {section('Your finalizers')}
              <FinalizerList hidden={hidden} />
            </View>
            <View style={{ marginTop: 16 }}>
              {section('Rewards per epoch')}
              <RewardBars width={PANE - 48} height={72} hidden={hidden} />
            </View>
            <PillButton
              label="Stake more"
              height={44}
              onPress={onStake}
              style={{ marginTop: 24, backgroundColor: '#0091FF26' }}
              icon={<Plus size={16} color={stakeBlue} strokeWidth={2.4} />}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default Earn;
