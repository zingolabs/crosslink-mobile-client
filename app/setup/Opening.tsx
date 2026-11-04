import React, { useEffect } from 'react';
import { ToastProvider } from 'react-native-toastier';

import { ScreenEnum } from '../AppState';
import Snackbars from '../../components/Components/Snackbars';
import Launching from '../lifecycle/Launching';
import { Lifecycle } from '../lifecycle/phase';
import { useLifecycle } from '../lifecycle';
import { enterPhase, useFeedback, usePhase } from '../store';
import { watchBackgroundFlag, watchNetInfo } from '../store/platform';
import { runOpening } from './openingFlow';

export default function Opening() {
  const { lifecycle, translate, actions } = useLifecycle();
  const opening = lifecycle as Extract<Lifecycle, { phase: 'opening' }>;
  const { boot, request } = opening;
  const { sessionOpened, openingFailed } = actions;

  useEffect(() => {
    enterPhase('opening', { ...boot.settings, translate });
    const stopNetInfo = watchNetInfo();
    const stopAppState = watchBackgroundFlag();
    runOpening({ boot, request, sessionOpened, openingFailed });
    return () => {
      stopNetInfo();
      stopAppState();
    };
  }, [boot, request, translate, sessionOpened, openingFailed]);

  const phase = usePhase();
  const { snackbars, removeFirstSnackbar } = useFeedback();

  if (lifecycle.phase !== 'opening' || phase !== 'opening') {
    return null;
  }

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={ScreenEnum.Boot}
      />
      <Launching
        empty={true}
        translate={translate}
        firstLaunchingMessage={boot.launching}
        biometricsFailed={false}
      />
    </ToastProvider>
  );
}
