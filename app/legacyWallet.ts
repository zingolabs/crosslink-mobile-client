import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';

import { Platform } from 'react-native';

import RPCModule from './RPCModule';

const WALLET_FILE = 'wallet.dat';
const LEGACY_WALLET_FILE = 'wallet.legacy.dat';
const MISMATCH_KEY = 'legacyChainMismatch';

type InspectResponse = {
  readable?: boolean;
  format_version?: number;
  newest_height?: number | null;
  chain_match?: boolean | null;
  normalize_to?: string | null;
  reason?: string;
};

/**
 * A wallet from the previous network reads fine — the old and the new chain
 * share the "test" name — but its synced blocks do not exist on the chain the
 * indexer serves. Only a hash mismatch (or an unreadable file) marks it.
 */
const isLegacy = (r: InspectResponse) =>
  r.readable === false || r.chain_match === false;

/**
 * Moves the wallet file aside when it belongs to the previous network, so the
 * app starts clean and the seed can be imported. The file is kept, never
 * deleted. Answers whether it quarantined anything.
 *
 * A chain mismatch must confirm on two consecutive boots before the wallet
 * moves — one flaky answer from an indexer never does. A file the current
 * reader cannot parse at all is unambiguous and moves on the first boot.
 *
 * The two platforms also keep the file in different shapes: Android stores
 * the decoded wallet binary, iOS its base64 text. When the file arrives in
 * the other shape, it is valid — inspect answers the bytes to write back and
 * this rewrites the file in place instead of quarantining it, so a wallet
 * moved between devices keeps working.
 */
export const quarantineLegacyWalletIfNeeded = async (
  serverUri: string,
  platform: string = Platform.OS,
): Promise<boolean> => {
  try {
    const path = `${RNFS.DocumentDirectoryPath}/${WALLET_FILE}`;
    if (!(await RNFS.exists(path))) {
      await AsyncStorage.removeItem(MISMATCH_KEY);
      return false;
    }
    const data = await RNFS.readFile(path, 'base64');
    if (!data) {
      return false;
    }
    const resp: InspectResponse = await JSON.parse(
      await RPCModule.inspectWallet(data, serverUri, platform),
    );
    if (resp.normalize_to) {
      await RNFS.writeFile(
        path,
        resp.normalize_to,
        platform === 'android' ? 'base64' : 'utf8',
      );
      await AsyncStorage.removeItem(MISMATCH_KEY);
      return false;
    }
    if (!isLegacy(resp)) {
      await AsyncStorage.removeItem(MISMATCH_KEY);
      return false;
    }
    if (resp.readable === false) {
      await RNFS.moveFile(
        path,
        `${RNFS.DocumentDirectoryPath}/${LEGACY_WALLET_FILE}`,
      );
      await AsyncStorage.removeItem(MISMATCH_KEY);
      return true;
    }
    const confirmed = (await AsyncStorage.getItem(MISMATCH_KEY)) === 'true';
    await AsyncStorage.setItem(MISMATCH_KEY, 'true');
    if (!confirmed) {
      return false;
    }
    await RNFS.moveFile(
      path,
      `${RNFS.DocumentDirectoryPath}/${LEGACY_WALLET_FILE}`,
    );
    await AsyncStorage.removeItem(MISMATCH_KEY);
    return true;
  } catch (e) {
    console.log(
      `legacy wallet check: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
};
