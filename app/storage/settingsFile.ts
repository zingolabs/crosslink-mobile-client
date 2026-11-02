import * as RNFS from 'react-native-fs';

import {
  CurrencyEnum,
  GlobalConst,
  IndexerNetworkEnum,
  LanguageEnum,
  SecurityType,
  SelectServerEnum,
  ServerType,
} from '../AppState';
import { PerformanceLevelEnum } from '../wallet/enums';

export interface SettingsFile {
  indexerServer?: ServerType;
  selectIndexerServer?: SelectServerEnum;
  indexerNetwork?: IndexerNetworkEnum;
  indexerServerPinned?: boolean;
  currency?: CurrencyEnum;
  language?: LanguageEnum;
  sendAll?: boolean;
  donation?: boolean;
  privacy?: boolean;
  firstInstall?: boolean;
  basicFirstViewSeed?: boolean;
  version?: string | null;
  security?: SecurityType;
  rescanMenu?: boolean;
  recoveryWalletInfoOnDevice?: boolean;
  performanceLevel?: PerformanceLevelEnum;
}

const fileName = (): string => RNFS.DocumentDirectoryPath + '/settings.json';

export async function readSettings(): Promise<SettingsFile> {
  try {
    if (!(await RNFS.exists(fileName()))) {
      console.log('settings read file: The file does not exists');
      return freshInstall();
    }
    const settings: SettingsFile = await JSON.parse(
      (await RNFS.readFile(fileName(), GlobalConst.utf8)).toString(),
    );
    return settings;
  } catch (err) {
    console.log('settings read file:', err);
    return freshInstall();
  }
}

function freshInstall(): SettingsFile {
  return {
    firstInstall: true,
    version: null,
  };
}

export async function writeSettings<K extends keyof SettingsFile>(
  name: K,
  value: NonNullable<SettingsFile[K]>,
): Promise<void> {
  const settings = await readSettings();
  const next: SettingsFile = { ...settings };
  next[name] = value;
  await RNFS.writeFile(fileName(), JSON.stringify(next), GlobalConst.utf8);
}
