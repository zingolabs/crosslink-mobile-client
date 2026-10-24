import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';

import RPCModule from './RPCModule';

const WALLET_FILE = 'wallet.dat';
const LEGACY_WALLET_FILE = 'wallet.legacy.dat';
const MISMATCH_KEY = 'legacyChainMismatch';

type InspectResponse = {
  readable?: boolean;
  format_version?: number;
  newest_height?: number | null;
  chain_match?: boolean | null;
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
 */
export const quarantineLegacyWalletIfNeeded = async (
  serverUri: string,
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
      await RPCModule.inspectWallet(data, serverUri),
    );
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
