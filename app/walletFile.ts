import { GlobalConst } from './AppState';
import type { WalletFileRecoveryInfo } from './wallet/generated/WalletFileRecoveryInfo';

export type { WalletFileRecoveryInfo };

const WALLET_FILE_ERROR_PREFIX = `${GlobalConst.error}: wallet file`;

/**
 * Whether a result from opening the wallet names the file itself as the
 * problem: missing, empty, unrecognised, too new, from another chain,
 * truncated or corrupt. Every other error is about the server or the
 * network, and the opening flow retries those.
 */
export const isWalletFileError = (result: string | null | undefined): boolean =>
  !!result && result.toLowerCase().startsWith(WALLET_FILE_ERROR_PREFIX);

/**
 * The recovery information the native side read from the front of the
 * wallet file, or null when the answer is an error or not the expected
 * shape.
 */
export const parseWalletFileRecoveryInfo = (
  result: string | null | undefined,
): WalletFileRecoveryInfo | null => {
  if (!result || result.toLowerCase().startsWith(GlobalConst.error)) {
    return null;
  }
  try {
    const parsed = JSON.parse(result) as Partial<WalletFileRecoveryInfo>;
    if (typeof parsed.birthday !== 'number') {
      return null;
    }
    if (!parsed.seed_phrase && !parsed.ufvk) {
      return null;
    }
    return {
      seed_phrase: parsed.seed_phrase ?? null,
      ufvk: parsed.ufvk ?? null,
      birthday: parsed.birthday,
      chain_name: parsed.chain_name ?? '',
      format_version: parsed.format_version ?? 0,
    };
  } catch {
    return null;
  }
};
