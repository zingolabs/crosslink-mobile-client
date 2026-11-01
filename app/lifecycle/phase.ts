import { IndexerNetworkEnum, LaunchingModeEnum, WalletKind } from '../AppState';
import { BootstrappedSettings } from '../settingsBootstrap';

export type OpenRequest =
  | { kind: 'open' }
  | { kind: 'create' }
  | { kind: 'restore'; seed: string; birthday: number };

export type SessionHandle = {
  walletKind: WalletKind;
  launching: LaunchingModeEnum;
};

export type BootInfo = {
  settings: BootstrappedSettings;
  launching: LaunchingModeEnum;
  indexerNetwork: IndexerNetworkEnum;
  indexerServerPinned: boolean;
};

export type BootFailure = 'biometrics';

export type Lifecycle =
  | { phase: 'booting'; failure?: BootFailure }
  | {
      phase: 'setup';
      boot: BootInfo;
      walletExists: boolean;
      coldStart: boolean;
      openFailed: boolean;
    }
  | { phase: 'opening'; boot: BootInfo; request: OpenRequest }
  | { phase: 'active'; boot: BootInfo; session: SessionHandle }
  | { phase: 'locked'; boot: BootInfo; session: SessionHandle };

export const lifecycle = {
  booting: (failure?: BootFailure): Lifecycle => ({
    phase: 'booting',
    failure,
  }),
  setup: (
    boot: BootInfo,
    walletExists: boolean,
    coldStart: boolean,
    openFailed: boolean,
  ): Lifecycle => ({
    phase: 'setup',
    boot,
    walletExists,
    coldStart,
    openFailed,
  }),
  opening: (boot: BootInfo, request: OpenRequest): Lifecycle => ({
    phase: 'opening',
    boot,
    request,
  }),
  active: (boot: BootInfo, session: SessionHandle): Lifecycle => ({
    phase: 'active',
    boot,
    session,
  }),
  locked: (boot: BootInfo, session: SessionHandle): Lifecycle => ({
    phase: 'locked',
    boot,
    session,
  }),
};

export function unreachable(value: never): never {
  throw new Error(`unhandled phase: ${JSON.stringify(value)}`);
}
