import { I18n } from 'i18n-js';

import {
  AppContextLoaded,
  AppContextLoading,
  CurrencyEnum,
  LanguageEnum,
  SelectServerEnum,
  SendPageStateClass,
  ToAddrClass,
  TranslateType,
} from '../app/AppState';
import { defaultAppContextLoaded } from '../app/context/contextAppLoaded';
import { defaultAppContextLoading } from '../app/context/contextAppLoading';

import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockIndexerServer } from '../__mocks__/dataMocks/mockServers';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import { mockSyncingStatus } from '../__mocks__/dataMocks/mockSyncingStatus';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';

const en = require('../app/translations/en.json');

// Real translations, not the Jest fixture — a visual reference is only useful
// with the strings users actually see.
const i18n = new I18n({ en });
i18n.locale = LanguageEnum.en;
i18n.enableFallback = true;
const translate = (key: string) => i18n.t(key) as TranslateType;

/**
 * A fully populated ContextAppLoaded value.
 *
 * Stories override single fields rather than rebuilding the object:
 *   parameters: { context: { totalBalance: null } }
 */
export const mockContextLoaded: AppContextLoaded = {
  ...defaultAppContextLoaded,

  translate,
  netInfo: mockNetInfo,
  info: mockInfo,
  wallet: mockWallet,
  background: mockBackground,
  syncingStatus: mockSyncingStatus,
  totalBalance: mockTotalBalance,
  addresses: mockAddresses,
  valueTransfers: mockValueTransfers,
  valueTransfersTotal: mockValueTransfers.length,
  messages: [],
  messagesTotal: 0,
  security: mockSecurity,
  zecPrice: mockZecPrice,
  indexerServer: mockIndexerServer,
  selectIndexerServer: SelectServerEnum.list,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  defaultUnifiedAddress: mockAddresses[0]?.address ?? '',
  zenniesDonationAddress: mockAddresses[0]?.address ?? '',
  zingolibVersion: 'storybook',
  sendPageState: new SendPageStateClass(new ToAddrClass(0)),

  staked: [],
  globalStaked: [],
  walletBonds: [],
  scheduledActions: [],

  // Actions are no-ops. A story that needs to assert on one passes its own.
  setSendPageState: () => {},
  setBackgroundError: () => {},
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  doRefresh: () => {},
  setZecPrice: () => {},
  setScheduledActions: () => {},
  setPrivacyOption: async () => {},
  requestFaucetFunds: async () => 'storybook-txid',
  getUfvk: async () => 'storybook-ufvk',
};

/**
 * The onboarding-time context. Much smaller than the loaded one: no wallet
 * data yet, only settings and connectivity.
 */
export const mockContextLoading: AppContextLoading = {
  ...defaultAppContextLoading,

  translate,
  netInfo: mockNetInfo,
  wallet: mockWallet,
  background: mockBackground,
  zecPrice: mockZecPrice,
  security: mockSecurity,
  indexerServer: mockIndexerServer,
  selectIndexerServer: SelectServerEnum.list,
  currency: CurrencyEnum.USDCurrency,
  language: LanguageEnum.en,
  zingolibVersion: 'storybook',

  setBackgroundError: () => {},
  addLastSnackbar: () => {},
  removeFirstSnackbar: () => {},
  setPrivacyOption: async () => {},
};
