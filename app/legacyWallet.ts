import WalletService from './wallet';

import { GlobalConst } from './AppState';

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
 * indexer serves. Only a hash mismatch (or an unreadable file) marks it, and
 * both are definitive: hashes cannot mismatch by accident, and an indexer
 * that cannot serve the block answers "unknown", never "mismatch".
 *
 * The quarantine must also happen before the first sync: once the wallet
 * syncs on this chain, its save rewrites the file with this chain's blocks
 * and the evidence — the record of the previous network — is gone.
 */
const isLegacy = (r: InspectResponse) =>
  r.readable === false || r.chain_match === false;

const hasWalletFile = async (): Promise<boolean> => {
  const exists = await WalletService.walletExists();
  return !!exists && exists !== GlobalConst.false;
};

/**
 * Moves the wallet file aside when it belongs to the previous network, so the
 * app starts clean and the seed can be imported. The file is kept, never
 * deleted. Answers whether it quarantined anything.
 *
 * The file never leaves the native side: zingolib reads it by path, in either
 * of the shapes the platforms used to write, and the first save rewrites it
 * in the one shape both platforms now share.
 */
export const quarantineLegacyWalletIfNeeded = async (
  serverUri: string,
  chainName: string,
): Promise<boolean> => {
  try {
    if (!(await hasWalletFile())) {
      return false;
    }
    const resp: InspectResponse = await JSON.parse(
      await WalletService.inspectWallet(serverUri, chainName),
    );
    console.log('legacy wallet inspect:', JSON.stringify(resp));
    if (isLegacy(resp)) {
      const moved = await WalletService.quarantineWallet();
      return !!moved && moved !== GlobalConst.false;
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
  chainName: string,
): Promise<boolean> => quarantineLegacyWalletIfNeeded('', chainName);
