import React, { useEffect } from 'react';

import { useLifecycle } from './LifecycleProvider';
import Launching from './Launching';
import { LaunchingModeEnum } from '../AppState';

export default function Boot() {
  const { lifecycle, translate, actions } = useLifecycle();

  useEffect(() => {
    actions.boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (lifecycle.phase !== 'booting') {
    return null;
  }

  return (
    <Launching
      empty={true}
      translate={translate}
      firstLaunchingMessage={LaunchingModeEnum.opening}
      biometricsFailed={lifecycle.failure === 'biometrics'}
      tryAgain={actions.retryBoot}
    />
  );
}
