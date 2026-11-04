import { useWalletData } from './appStore';
import { useNowSeconds } from './clock';

export type StakingDayCountdown = {
  stakingDay: boolean;
  timeToStakingDaySeconds: number;
  timeLeftStakingDaySeconds: number;
};

const remaining = (base: number, computedAt: number, now: number): number => {
  if (base <= 0 || computedAt <= 0 || now <= 0) {
    return base;
  }
  const elapsed = now - computedAt / 1000;
  return Math.max(0, Math.round(base - elapsed));
};

export const useStakingDayCountdown = (
  ticking: boolean = true,
): StakingDayCountdown => {
  const {
    stakingDay,
    timeToStakingDaySeconds,
    timeLeftStakingDaySeconds,
    stakingDayComputedAt,
  } = useWalletData();
  const now = useNowSeconds(ticking);
  return {
    stakingDay,
    timeToStakingDaySeconds: remaining(
      timeToStakingDaySeconds,
      stakingDayComputedAt,
      now,
    ),
    timeLeftStakingDaySeconds: remaining(
      timeLeftStakingDaySeconds,
      stakingDayComputedAt,
      now,
    ),
  };
};
