/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { QrCode, Send } from 'lucide-react-native';

import { useTheme } from '../../app/theme';
import { VariantActions, usePrivacy, useTransfers } from './shared';
import {
  ActivityList,
  HAIRLINE,
  HideToggle,
  PANEL,
  PillButton,
  TxDetail,
  t,
  useSelection,
} from './parts';
import {
  NetworkModule,
  PoolLegend,
  PrivacyGauge,
  ShieldPrompt,
  SpendableHeader,
} from './modules';

const SIDEBAR = 320;
const LIST = 460;

const Status: React.FC<VariantActions & { insetTop: number }> = ({
  insetTop,
  onSend,
  onReceive,
  onShield,
}) => {
  const { colors } = useTheme();
  const transfers = useTransfers();
  const { hidden, toggle } = usePrivacy();
  const { selected, current, onSelect } = useSelection(transfers);

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
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insetTop + 12,
            paddingHorizontal: 24,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <SpendableHeader hidden={hidden} size={36} />

          <View
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: HAIRLINE,
            }}
          >
            {section('Privacy')}
            <View style={[t.row, { gap: 16 }]}>
              <PrivacyGauge size={104} hidden={hidden} />
              <View style={{ flex: 1 }}>
                <PoolLegend hidden={hidden} notes={false} />
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <ShieldPrompt hidden={hidden} onShield={onShield} compact />
            </View>
          </View>

          <View
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: HAIRLINE,
            }}
          >
            {section('Network')}
            <NetworkModule />
          </View>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: 20,
            paddingTop: 12,
            gap: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: HAIRLINE,
          }}
        >
          <View style={[t.row, { gap: 12 }]}>
            <PillButton
              tone="primary"
              label="Send"
              onPress={onSend}
              style={{ flex: 1 }}
              icon={<Send size={16} color="#fff" strokeWidth={2.2} />}
            />
            <PillButton
              label="Receive"
              onPress={onReceive}
              style={{ flex: 1 }}
              icon={
                <QrCode size={16} color={colors.fgDefault} strokeWidth={2.2} />
              }
            />
          </View>
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
          <TxDetail key={current.txid} vt={current} hidden={hidden} compact />
        ) : null}
      </View>
    </View>
  );
};

export default Status;
