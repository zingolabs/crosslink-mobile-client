import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';

import { readSettings, writeSettings } from './storage/settingsFile';
import {
  ChainNameEnum,
  CurrencyEnum,
  LanguageEnum,
  SecurityType,
  SelectServerEnum,
  ServerType,
} from './AppState';
import { RPCPerformanceLevelEnum } from './wallet/enums/RPCPerformanceLevelEnum';

export const translations = {
  en: require('./translations/en.json'),
  es: require('./translations/es.json'),
  pt: require('./translations/pt.json'),
  ru: require('./translations/ru.json'),
  tr: require('./translations/tr.json'),
};

export type BootstrappedSettings = {
  language: LanguageEnum;
  currency: CurrencyEnum;
  indexerServer: ServerType;
  selectIndexerServer: SelectServerEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  security: SecurityType;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;
};

export const fallbackSettings: BootstrappedSettings = {
  language: LanguageEnum.en,
  currency: CurrencyEnum.noCurrency,
  indexerServer: {
    uri: '',
    chainName: ChainNameEnum.testChainName,
  } as ServerType,
  selectIndexerServer: SelectServerEnum.custom,
  sendAll: true,
  donation: false,
  privacy: false,
  security: {
    startApp: false,
    foregroundApp: false,
    sendConfirm: false,
    seedUfvkScreen: false,
    rescanScreen: false,
    settingsScreen: false,
    changeWalletScreen: false,
    restoreWalletBackupScreen: false,
  },
  rescanMenu: true,
  recoveryWalletInfoOnDevice: false,
  performanceLevel: RPCPerformanceLevelEnum.Medium,
};

export const createI18n = (): I18n => {
  I18nManager.forceRTL(false);
  return new I18n(translations);
};

export const createTranslate = (i18n: I18n) => (key: string) => i18n.t(key);

const isLanguage = (value: unknown): value is LanguageEnum =>
  value === LanguageEnum.en ||
  value === LanguageEnum.es ||
  value === LanguageEnum.pt ||
  value === LanguageEnum.ru ||
  value === LanguageEnum.tr;

const isCurrency = (value: unknown): value is CurrencyEnum =>
  value === CurrencyEnum.noCurrency ||
  value === CurrencyEnum.USDCurrency ||
  value === CurrencyEnum.USDTORCurrency;

const isSelectServer = (value: unknown): value is SelectServerEnum =>
  value === SelectServerEnum.auto ||
  value === SelectServerEnum.custom ||
  value === SelectServerEnum.list ||
  value === SelectServerEnum.offline;

const isPerformanceLevel = (value: unknown): value is RPCPerformanceLevelEnum =>
  value === RPCPerformanceLevelEnum.High ||
  value === RPCPerformanceLevelEnum.Low ||
  value === RPCPerformanceLevelEnum.Maximum ||
  value === RPCPerformanceLevelEnum.Medium;

const isBoolean = (value: unknown): value is boolean =>
  value === true || value === false;

export const bootstrapSettings = async (
  i18n: I18n,
  options: { validateCurrency: boolean },
): Promise<BootstrappedSettings> => {
  const read = await readSettings();
  const settings: BootstrappedSettings = { ...fallbackSettings };

  if (isLanguage(read.language)) {
    settings.language = read.language;
  } else {
    settings.language = LanguageEnum.en;
    await writeSettings('language', settings.language);
  }
  i18n.locale = settings.language;
  if (!options.validateCurrency) {
    settings.currency = read.currency ?? fallbackSettings.currency;
  } else if (isCurrency(read.currency)) {
    settings.currency = read.currency;
  } else {
    await writeSettings('currency', settings.currency);
  }

  if (read.indexerServer) {
    settings.indexerServer = read.indexerServer;
  } else {
    await writeSettings('indexerServer', settings.indexerServer);
  }

  if (isSelectServer(read.selectIndexerServer)) {
    settings.selectIndexerServer = read.selectIndexerServer;
  } else {
    await writeSettings('selectIndexerServer', settings.selectIndexerServer);
  }

  if (isBoolean(read.sendAll)) {
    settings.sendAll = read.sendAll;
  } else {
    await writeSettings('sendAll', settings.sendAll);
  }

  if (isBoolean(read.donation)) {
    settings.donation = read.donation;
  } else {
    await writeSettings('donation', settings.donation);
  }

  if (isBoolean(read.privacy)) {
    settings.privacy = read.privacy;
  } else {
    await writeSettings('privacy', settings.privacy);
  }

  if (read.security) {
    settings.security = read.security;
  } else {
    await writeSettings('security', settings.security);
  }

  if (isBoolean(read.rescanMenu)) {
    settings.rescanMenu = read.rescanMenu;
  } else {
    await writeSettings('rescanMenu', settings.rescanMenu);
  }

  if (isBoolean(read.recoveryWalletInfoOnDevice)) {
    settings.recoveryWalletInfoOnDevice = read.recoveryWalletInfoOnDevice;
  } else {
    await writeSettings(
      'recoveryWalletInfoOnDevice',
      settings.recoveryWalletInfoOnDevice,
    );
  }

  if (isPerformanceLevel(read.performanceLevel)) {
    settings.performanceLevel = read.performanceLevel;
  } else {
    await writeSettings('performanceLevel', settings.performanceLevel);
  }

  return settings;
};
