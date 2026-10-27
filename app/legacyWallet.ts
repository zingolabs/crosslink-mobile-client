import * as RNFS from 'react-native-fs';

import RPCModule from './RPCModule';

const WALLET_FILE = 'wallet.dat';
const LEGACY_WALLET_FILE = 'wallet.legacy.dat';

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
 * indexer serves. Only a hash mismatch (or an unreadable file) marks it, and
 * both are definitive: hashes cannot mismatch by accident, and an indexer
 * that cannot serve the block answers "unknown", never "mismatch".
 *
 * The quarantine must also happen before the first sync: once the wallet
 * syncs on this chain, its save task rewrites the file with this chain's
 * blocks and the evidence — the record of the previous network — is gone.
 */
const isLegacy = (r: InspectResponse) =>
  r.readable === false || r.chain_match === false;

/**
 * Moves the wallet file aside when it belongs to the previous network, so the
 * app starts clean and the seed can be imported. The file is kept, never
 * deleted. Answers whether it quarantined anything.
 *
 * The two platforms also keep the file in different shapes: Android stores
 * the decoded wallet binary, iOS its base64 text. When the file arrives in
 * the other shape, it is valid — inspect answers the bytes to write back and
 * this rewrites the file in place, so a wallet moved between devices keeps
 * working. A chain mismatch outranks the shape: a wallet from another network
 * is quarantined even when this platform could read its file.
 */
export const quarantineLegacyWalletIfNeeded = async (
  serverUri: string,
  platform: string,
): Promise<boolean> => {
  try {
    const path = `${RNFS.DocumentDirectoryPath}/${WALLET_FILE}`;
    if (!(await RNFS.exists(path))) {
      return false;
    }
    const data = await RNFS.readFile(path, 'base64');
    if (!data) {
      return false;
    }
    const resp: InspectResponse = await JSON.parse(
      await RPCModule.inspectWallet(data, serverUri, platform),
    );
    console.log('legacy wallet inspect:', JSON.stringify(resp));
    // the chain mismatch wins over the shape: a wallet whose blocks belong to
    // another network must never be loaded, even when its shape is one this
    // platform could read.
    if (isLegacy(resp)) {
      await RNFS.moveFile(
        path,
        `${RNFS.DocumentDirectoryPath}/${LEGACY_WALLET_FILE}`,
      );
      return true;
    }
    if (resp.normalize_to) {
      await RNFS.writeFile(
        path,
        resp.normalize_to,
        platform === 'android' ? 'base64' : 'utf8',
      );
    }
    return false;
  } catch (e) {
    console.log(
      `legacy wallet check: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
};

/**
 * The load-failure counterpart of the check above, for files that slip past
 * it: when opening the wallet fails, this asks — with no server contact, so
 * it also works offline — whether the file is one this build can read at
 * all, and moves it aside when it is not. Answers whether it quarantined
 * anything, so the caller can start clean instead of showing a dead-end
 * error for a file that could never have opened.
 */
export const quarantineUnreadableWallet = async (
  platform: string,
): Promise<boolean> => quarantineLegacyWalletIfNeeded('', platform);
