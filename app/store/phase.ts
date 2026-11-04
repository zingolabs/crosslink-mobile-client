import { appStore, AppStore, initialAppStore, Phase } from './appStore';
import { feedbackActions } from './feedback';

export const enterPhase = (phase: Phase, domains: Partial<AppStore>): void =>
  appStore.setState(
    { ...initialAppStore(), ...feedbackActions, ...domains, phase },
    true,
  );
