import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { faChartPie, faGear } from '@fortawesome/free-solid-svg-icons';
import { HandCoins, Layers } from 'lucide-react-native';

import { RouteEnum } from '../../../app/AppState';
import {
  useSettings,
  useStatus,
  useWalletData,
} from '../../../app/context';
import { useTheme } from '../../../app/theme';
import { HeaderIconButton } from '../../Header';
import SummaryPanel, { IconAction } from '../../Components/SummaryPanel';
import StakingDayStatusBar from './StakingDayStatusBar';

/** Staked amount, the staking-day status, and Stake, Unstake. */
const StakingSummary: React.FC = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const { privacy } = useSettings();
  const { totalBalance, info, syncingStatus } = useWalletData();
  const { netInfo } = useStatus();

  const pct =
    syncingStatus?.percentage_total_outputs_scanned ||
    syncingStatus?.percentage_total_blocks_scanned ||
    0;
  const icon = { size: 22, strokeWidth: 2.2, color: colors.fgDefault };
  // the device can be online while the indexer itself is unreachable;
  // both cases mean the amounts shown are stale
  const reachable = !!netInfo.isConnected && !info.serverUnreachable;

  return (
    <SummaryPanel
      testID="staking.summary"
      amount={totalBalance?.stakedAmount ?? 0}
      unit={info.currencyName}
      settled={pct >= 100}
      connected={reachable}
      privacy={privacy}
      leading={<StakingDayStatusBar />}
      trailing={
        <>
          <HeaderIconButton
            testID="header.finalizers"
            icon={faChartPie}
            accessibilityLabel="Finalizers"
            onPress={() => navigation.navigate(RouteEnum.Distribution)}
          />
          <HeaderIconButton
            testID="header.settings"
            icon={faGear}
            accessibilityLabel="Settings"
            onPress={() => navigation.navigate(RouteEnum.SettingsStack)}
          />
        </>
      }
      actions={
        <>
          <IconAction
            title="Stake"
            icon={<Layers {...icon} />}
            prominent
            onPress={() => navigation.navigate(RouteEnum.Stake)}
          />
          <IconAction
            title="Unstake"
            icon={<HandCoins {...icon} />}
            onPress={() =>
              navigation.navigate(RouteEnum.Unstake, {
                finalizer: undefined,
                txid: undefined,
                staked: undefined,
              })
            }
          />
        </>
      }
    />
  );
};

export default StakingSummary;
