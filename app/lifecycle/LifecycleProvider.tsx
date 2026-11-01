import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

import { LaunchingModeEnum, GlobalConst } from '../AppState';
import RPCModule from '../RPCModule';
import simpleBiometrics from '../simpleBiometrics';
import { readSettings, writeSettings } from '../storage/settingsFile';
import {
  createI18n,
  createTranslate,
  bootstrapSettings,
} from '../settingsBootstrap';
import { IndexerNetworkEnum } from '../AppState/enums/IndexerNetworkEnum';
import {
  Lifecycle,
  OpenRequest,
  SessionHandle,
  BootInfo,
  lifecycle as make,
} from './phase';

export type LifecycleActions = {
  boot: () => void;
  retryBoot: () => void;
  startOpening: (request: OpenRequest) => void;
  sessionOpened: (session: SessionHandle) => void;
  openingFailed: () => void;
  leaveSession: (request?: OpenRequest) => void;
  lockGate: () => void;
  unlockGate: () => void;
};

type LifecycleValue = {
  lifecycle: Lifecycle;
  translate: (key: string) => string;
  actions: LifecycleActions;
};

const LifecycleContext = createContext<LifecycleValue | null>(null);

export function useLifecycle(): LifecycleValue {
  const value = useContext(LifecycleContext);
  if (!value) {
    throw new Error('LifecycleProvider missing');
  }
  return value;
}

const detectLaunching = async (
  translate: (key: string) => string,
): Promise<LaunchingModeEnum> => {
  const read = await readSettings();
  if (read.version === null) {
    return LaunchingModeEnum.installing;
  }
  if (
    read.version === '' ||
    read.version !== (translate('version') as string)
  ) {
    return LaunchingModeEnum.updating;
  }
  return LaunchingModeEnum.opening;
};

const readBootInfo = async (
  i18n: ReturnType<typeof createI18n>,
  translate: (key: string) => string,
): Promise<BootInfo> => {
  const [settings, launching, read] = await Promise.all([
    bootstrapSettings(i18n, { validateCurrency: true }),
    detectLaunching(translate),
    readSettings(),
  ]);
  let indexerNetwork = IndexerNetworkEnum.stable;
  if (
    read.indexerNetwork === IndexerNetworkEnum.stable ||
    read.indexerNetwork === IndexerNetworkEnum.nightly
  ) {
    indexerNetwork = read.indexerNetwork;
  } else {
    await writeSettings('indexerNetwork', IndexerNetworkEnum.stable);
  }
  let indexerServerPinned = false;
  if (read.indexerServerPinned === true || read.indexerServerPinned === false) {
    indexerServerPinned = read.indexerServerPinned;
  } else {
    await writeSettings('indexerServerPinned', false);
  }
  return { settings, launching, indexerNetwork, indexerServerPinned };
};

const walletExists = async (): Promise<boolean> => {
  const exists = await RPCModule.walletExists();
  return !!exists && exists !== GlobalConst.false;
};

export function LifecycleProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Lifecycle;
}) {
  const i18n = useMemo(() => createI18n(), []);
  const translate = useMemo(() => createTranslate(i18n), [i18n]);

  const [lifecycleState, setLifecycleState] = useState<Lifecycle>(
    initial ?? make.booting(),
  );

  const actions = useMemo<LifecycleActions>(() => {
    const boot = () => {
      setLifecycleState(make.booting());
      (async () => {
        const bootInfo = await readBootInfo(i18n, translate);
        const biometricsFailed = bootInfo.settings.security.startApp
          ? (await simpleBiometrics({ translate })) === false
          : false;
        if (biometricsFailed) {
          setLifecycleState(make.booting('biometrics'));
          return;
        }
        if (await walletExists()) {
          setLifecycleState(make.opening(bootInfo, { kind: 'open' }));
        } else {
          setLifecycleState(make.setup(bootInfo, true, true, false));
        }
      })().catch(e => {
        console.error('boot failed', e);
        setLifecycleState(make.booting());
      });
    };

    const startOpening = (request: OpenRequest) => {
      (async () => {
        const bootInfo = await readBootInfo(i18n, translate);
        setLifecycleState(make.opening(bootInfo, request));
      })();
    };

    const leaveSession = (request?: OpenRequest) => {
      (async () => {
        const bootInfo = await readBootInfo(i18n, translate);
        if (request) {
          setLifecycleState(make.opening(bootInfo, request));
        } else {
          const exists = await walletExists();
          setLifecycleState(make.setup(bootInfo, exists, false, false));
        }
      })();
    };

    return {
      boot,
      retryBoot: boot,
      startOpening,
      sessionOpened: session => {
        setLifecycleState(cur =>
          cur.phase === 'opening' ? make.active(cur.boot, session) : cur,
        );
      },
      openingFailed: () => {
        setLifecycleState(cur =>
          cur.phase === 'opening'
            ? make.setup(cur.boot, true, false, true)
            : cur,
        );
      },
      leaveSession,
      lockGate: () => {
        setLifecycleState(cur =>
          cur.phase === 'active' ? make.locked(cur.boot, cur.session) : cur,
        );
      },
      unlockGate: () => {
        setLifecycleState(cur =>
          cur.phase === 'locked' ? make.active(cur.boot, cur.session) : cur,
        );
      },
    };
  }, [translate, i18n]);

  const value = useMemo(
    () => ({ lifecycle: lifecycleState, translate, actions }),
    [lifecycleState, translate, actions],
  );

  return (
    <LifecycleContext.Provider value={value}>
      {children}
    </LifecycleContext.Provider>
  );
}
