import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from 'react-native-toastier';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RouteEnum, ScreenEnum } from '../AppState';
import { StakingDayActivitySync } from '../StakingDayActivity';
import Snackbars from '../../components/Components/Snackbars';
import { Launching, useLifecycle } from '../lifecycle';
import simpleBiometrics from '../simpleBiometrics';
import { SessionStackParamList } from '../types';
import { navigationTheme, useTheme } from '../theme';
import { useAppStore, useFeedback, usePhase } from '../store';
import {
  setScrollToBottom,
  setScrollToTop,
  setShieldingAmount,
} from '../wallet/walletUpdates';
import { BootInfo, SessionHandle } from '../lifecycle/phase';
import type { LifecycleActions } from '../lifecycle/LifecycleProvider';
import {
  beginUnstakeTransaction,
  changeWallet,
  leaveSession,
  redelegateTransaction,
  sendTransaction,
  setSecurityOption,
  setServerOption,
  setSessionGated,
  stakeTransaction,
  startSession,
  withdrawBondTransaction,
} from './controller';
import { navigationRef } from './navigation';
import { MainTabs } from './components/MainTabs';
import Computing from './components/Computing';
import ComputingOK from './components/ComputingOK';
import ComputingError from './components/ComputingError';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Faucet from '../../components/Faucet';
import ValueTransferDetail from '../../components/History/components/ValueTransferDetail';
import ScannerAddress from '../../components/Send/components/ScannerAddress';
import { AddStakeScreen, Unstake } from '../../components/Staking';
import Distribution from '../../components/Distribution';
import SyncReport from '../../components/SyncReport';
import Redelegate from '../../components/Staking/components/Redelegate';
import Finalizers from '../../components/Finalizers/Finalizers';
import SettingsNavigator from '../../components/Settings/SettingsNavigator';
import ScheduledActionDetail from '../../components/ScheduledActions/ScheduledActionDetail';
import { FinalizerDetail } from '../../components/Staking/Finalizers/FinalizerDetail';

const SessionStack = createNativeStackNavigator<SessionStackParamList>();

export default function Session() {
  const { lifecycle, translate, actions } = useLifecycle();
  const [gateFailed, setGateFailed] = useState<boolean>(false);
  const [gateAttempt, setGateAttempt] = useState<number>(0);

  const gated = lifecycle.phase === 'locked';

  useEffect(() => {
    if (!gated) {
      return;
    }
    let cancelled = false;
    (async () => {
      const passed = (await simpleBiometrics({ translate })) !== false;
      if (cancelled) {
        return;
      }
      if (passed) {
        actions.unlockGate();
      } else {
        setGateFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gated, gateAttempt, translate, actions]);

  if (lifecycle.phase !== 'active' && lifecycle.phase !== 'locked') {
    return null;
  }

  return (
    <View style={styles.fill}>
      <SessionLoaded
        boot={lifecycle.boot}
        session={lifecycle.session}
        gated={gated}
        translate={translate}
        actions={actions}
      />
      {gated && (
        <View style={StyleSheet.absoluteFill}>
          <Launching
            empty={true}
            translate={translate}
            firstLaunchingMessage={lifecycle.session.launching}
            biometricsFailed={gateFailed}
            tryAgain={() => {
              setGateFailed(false);
              setGateAttempt(n => n + 1);
            }}
          />
        </View>
      )}
    </View>
  );
}

type SessionLoadedProps = {
  boot: BootInfo;
  session: SessionHandle;
  gated: boolean;
  translate: (key: string) => string;
  actions: LifecycleActions;
};

export const SessionLoaded: React.FC<SessionLoadedProps> = ({
  boot,
  session,
  gated,
  translate,
  actions,
}) => {
  const { colors } = useTheme();
  const phase = usePhase();
  const { snackbars, removeFirstSnackbar } = useFeedback();
  const scrollToTop = useAppStore(s => s.scrollToTop);

  useEffect(
    () => startSession({ boot, session, translate, actions }),
    [boot, session, translate, actions],
  );

  useEffect(() => {
    setSessionGated(gated);
  }, [gated]);

  if (phase !== 'session') {
    return null;
  }

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={ScreenEnum.Session}
      />
      <StakingDayActivitySync />
      <GestureHandlerRootView>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme(colors)}
        >
          <SessionStack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'simple_push',
            }}
          >
            <SessionStack.Screen name={RouteEnum.MainTabs}>
              {() => (
                <MainTabs
                  scrollToTop={scrollToTop}
                  setScrollToTop={setScrollToTop}
                  setScrollToBottom={setScrollToBottom}
                  setShieldingAmount={setShieldingAmount}
                />
              )}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Send}>
              {stackProps => (
                <Send
                  setShieldingAmount={setShieldingAmount}
                  setScrollToTop={setScrollToTop}
                  setScrollToBottom={setScrollToBottom}
                  setServerOption={setServerOption}
                  setSecurityOption={setSecurityOption}
                  {...stackProps}
                  sendTransaction={sendTransaction}
                />
              )}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Receive}>
              {stackProps => (
                <Receive setSecurityOption={setSecurityOption} {...stackProps} />
              )}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Distribution}>
              {stackProps => <Distribution {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.SyncReport}>
              {stackProps => <SyncReport {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen
              name={RouteEnum.Finalizers}
              options={{ presentation: 'modal' }}
            >
              {stackProps => <Finalizers {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Faucet}>
              {stackProps => <Faucet {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Computing}>
              {stackProps => <Computing {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.ComputingOK}>
              {stackProps => <ComputingOK {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.ComputingError}>
              {stackProps => <ComputingError {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.ValueTransferDetail}>
              {stackProps => <ValueTransferDetail {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.FinalizerDetail}>
              {stackProps => <FinalizerDetail {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.ScannerAddress}>
              {stackProps => <ScannerAddress {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.SettingsStack}>
              {stackProps => (
                <SettingsNavigator
                  {...stackProps}
                  onClickOKChangeWallet={changeWallet}
                  leaveSession={leaveSession}
                />
              )}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Stake}>
              {stackProps => <AddStakeScreen {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Unstake}>
              {stackProps => <Unstake {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.Redelegate}>
              {stackProps => <Redelegate {...stackProps} />}
            </SessionStack.Screen>

            <SessionStack.Screen name={RouteEnum.ScheduledActionDetail}>
              {stackProps => (
                <ScheduledActionDetail
                  {...stackProps}
                  beginUnstakeTransaction={beginUnstakeTransaction}
                  withdrawBondTransaction={withdrawBondTransaction}
                  stakeTransaction={stakeTransaction}
                  redelegateTransaction={redelegateTransaction}
                />
              )}
            </SessionStack.Screen>
          </SessionStack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
