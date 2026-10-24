import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { Droplets, ScanQrCode, Send, ShieldOff } from 'lucide-react-native';

import { GlobalConst, RouteEnum } from '../../../app/AppState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
} from '../../../app/context';
import { useTheme, text, space } from '../../../app/theme';
import { HeaderIconButton } from '../../Header';
import SummaryPanel, {
  IconAction,
  formatBalance,
} from '../../Components/SummaryPanel';

export { SUMMARY_RADIUS } from '../../Components/SummaryPanel';

/** Spendable balance, unshielded amount, and Send, Receive, Faucet. */
const HomeSummary: React.FC = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const { requestFaucetFunds } = useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const { totalBalance, info, syncingStatus, netInfo, defaultUnifiedAddress } =
    useAppLoadedWallet();

  const pct =
    syncingStatus?.percentage_total_outputs_scanned ||
    syncingStatus?.percentage_total_blocks_scanned ||
    0;
  const unshielded = totalBalance?.totalTransparentBalance ?? 0;
  const icon = { size: 22, strokeWidth: 2.2, color: colors.fgDefault };

  const faucet = async () => {
    const resp = await requestFaucetFunds(defaultUnifiedAddress);
    if (resp.toLowerCase().startsWith(GlobalConst.error)) {
      Alert.alert('Faucet Error', resp);
    } else {
      Alert.alert('Faucet', 'Request sent to faucet!');
    }
  };

  return (
    <SummaryPanel
      testID="home.summary"
      amount={totalBalance?.totalSpendableBalance ?? 0}
      unit={info.currencyName}
      settled={pct >= 100}
      connected={!!netInfo.isConnected}
      privacy={privacy}
      trailing={
        <HeaderIconButton
          testID="header.settings"
          icon={faGear}
          accessibilityLabel="Settings"
          onPress={() => navigation.navigate(RouteEnum.SettingsStack)}
        />
      }
      secondary={
        unshielded > 0 ? (
          <View
            accessible
            accessibilityLabel={`Unshielded ${formatBalance(unshielded)} ${info.currencyName}`}
            style={styles.unshielded}
          >
            <ShieldOff size={13} strokeWidth={2.4} color={colors.fgMuted} />
            <Text
              style={[
                text.caption,
                styles.unshieldedAmount,
                { color: colors.fgMuted },
              ]}
            >
              {privacy ? '••••' : formatBalance(unshielded)}
            </Text>
          </View>
        ) : null
      }
      actions={
        <>
          <IconAction
            title="Send"
            icon={<Send {...icon} />}
            onPress={() => navigation.navigate(RouteEnum.Send)}
          />
          <IconAction
            title="Receive"
            icon={<ScanQrCode {...icon} />}
            onPress={() => navigation.navigate(RouteEnum.Receive)}
          />
          <IconAction
            title="Faucet"
            icon={<Droplets {...icon} />}
            prominent
            onPress={faucet}
          />
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  unshielded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: 2,
  },
  unshieldedAmount: {
    fontVariant: ['tabular-nums'],
  },
});

export default HomeSummary;
