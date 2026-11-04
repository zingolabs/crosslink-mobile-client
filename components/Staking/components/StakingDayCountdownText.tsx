import React from 'react';

import RegText from '../../Components/RegText';
import { useStakingDayCountdown } from '../../../app/store';
import { formatSeconds } from '../../../app/utils/Utils';
import { text, useTheme } from '../../../app/theme';

type StakingDayCountdownTextProps = {
  active: boolean;
};

const StakingDayCountdownText: React.FC<StakingDayCountdownTextProps> = ({
  active,
}) => {
  const { colors } = useTheme();
  const { stakingDay, timeToStakingDaySeconds, timeLeftStakingDaySeconds } =
    useStakingDayCountdown(active);
  const seconds = stakingDay
    ? timeLeftStakingDaySeconds
    : timeToStakingDaySeconds;
  const calculating = seconds === 0;
  const title = stakingDay ? 'Staking day active' : 'Staking day inactive';

  return (
    <>
      <RegText
        numberOfLines={1}
        ellipsizeMode="clip"
        style={calculating ? text.caption2 : text.subheadline}
      >
        {calculating ? 'calculating...' : formatSeconds(seconds)}
      </RegText>
      <RegText
        numberOfLines={1}
        style={[text.caption1, { color: colors.fgMuted }]}
      >
        {title}
      </RegText>
    </>
  );
};

export default StakingDayCountdownText;
