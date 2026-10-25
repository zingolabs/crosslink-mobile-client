import React, { useEffect, useRef } from 'react';
import { NativeModules, Platform } from 'react-native';

import { useAppLoadedWallet } from './context';

export type StakingDayActivityPayload = {
  stakingDay: boolean;
  targetTimestamp: number;
  title: string;
};

type StakingDayActivityModuleType = {
  isAvailable(): Promise<boolean>;
  startActivity(
    stakingDay: boolean,
    targetTimestamp: number,
    title: string,
  ): Promise<boolean>;
  updateActivity(
    stakingDay: boolean,
    targetTimestamp: number,
    title: string,
  ): Promise<boolean>;
  stopActivity(): Promise<boolean>;
};

const nativeModule: StakingDayActivityModuleType | undefined =
  Platform.OS === 'ios' ? NativeModules.StakingDayActivityModule : undefined;

const isAvailable = (): Promise<boolean> =>
  nativeModule ? nativeModule.isAvailable() : Promise.resolve(false);

const startActivity = (payload: StakingDayActivityPayload): Promise<boolean> =>
  nativeModule
    ? nativeModule.startActivity(
        payload.stakingDay,
        payload.targetTimestamp,
        payload.title,
      )
    : Promise.resolve(false);

const updateActivity = (
  payload: StakingDayActivityPayload,
): Promise<boolean> =>
  nativeModule
    ? nativeModule.updateActivity(
        payload.stakingDay,
        payload.targetTimestamp,
        payload.title,
      )
    : Promise.resolve(false);

const stopActivity = (): Promise<boolean> =>
  nativeModule ? nativeModule.stopActivity() : Promise.resolve(false);

const useStakingDayActivity = (): void => {
  const { stakingDay, timeToStakingDaySeconds, timeLeftStakingDaySeconds } =
    useAppLoadedWallet();

  const runningRef = useRef(false);
  const syncedStateRef = useRef('');

  useEffect(() => {
    const seconds = stakingDay
      ? timeLeftStakingDaySeconds
      : timeToStakingDaySeconds;

    if (seconds <= 0) {
      return;
    }

    const sync = async () => {
      if (!(await isAvailable())) {
        return;
      }

      const targetTimestamp = Date.now() + seconds * 1000;
      const stateKey = `${stakingDay}|${Math.round(targetTimestamp)}`;
      if (stateKey === syncedStateRef.current) {
        return;
      }
      syncedStateRef.current = stateKey;

      const title = stakingDay ? 'Staking day active' : 'Staking day inactive';
      const payload: StakingDayActivityPayload = {
        stakingDay,
        targetTimestamp: targetTimestamp / 1000,
        title,
      };

      if (runningRef.current) {
        await updateActivity(payload);
      } else {
        runningRef.current = await startActivity(payload);
      }
    };
    sync();
  }, [stakingDay, timeLeftStakingDaySeconds, timeToStakingDaySeconds]);
};

export const StakingDayActivitySync: React.FC = () => {
  useStakingDayActivity();
  return null;
};

export default {
  isAvailable,
  startActivity,
  updateActivity,
  stopActivity,
};
