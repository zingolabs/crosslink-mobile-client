import { StakingActionKindEnum } from '../AppState';
import {
  readScheduledActions,
  removeScheduledAction,
} from '../storage/scheduledActionsFile';
import { scheduleReminder } from '../../components/Staking/components/scheduleReminder';
import { patch, read } from '../store/appStore';

const CYCLE = 150;
const ACTIVE_WINDOW = 70;

export const recalculateStakingDay = async (
  averageBlockTime: number,
): Promise<void> => {
  const latest = read().info.latestBlock ?? 0;
  const mod = latest % CYCLE;
  const stakingDay = mod < ACTIVE_WINDOW;
  const remaining = stakingDay ? 0 : CYCLE - mod;
  const left = stakingDay ? ACTIVE_WINDOW - mod : 0;

  let actions = await readScheduledActions();
  const moves = actions.filter(sa => sa.kind === StakingActionKindEnum.Move);
  if (moves.length > 0) {
    await Promise.all(moves.map(sa => removeScheduledAction(sa.id)));
    actions = await readScheduledActions();
  }

  const secondsToStakingDay = remaining * averageBlockTime;
  if (secondsToStakingDay > 0 && actions.length > 0) {
    await scheduleReminder({
      seconds: secondsToStakingDay,
      numberActions: actions.length,
    });
  }

  patch({
    stakingDay,
    timeToStakingDaySeconds: secondsToStakingDay,
    timeLeftStakingDaySeconds: left * averageBlockTime,
    blocksToStakingDay: remaining,
    blocksLeftStakingDay: left,
    blocksTotalStakingDay: CYCLE - ACTIVE_WINDOW,
    stakingDayComputedAt: Date.now(),
  });
};
