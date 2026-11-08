import {
  isWalletFileError,
  parseWalletFileRecoveryInfo,
} from '../app/walletFile';

describe('wallet file errors', () => {
  test('names the file as the problem only for wallet file errors', () => {
    expect(isWalletFileError('Error: wallet file not found')).toBe(true);
    expect(
      isWalletFileError('Error: wallet file ends early while reading the seed'),
    ).toBe(true);
    expect(
      isWalletFileError(
        'Error: wallet file belongs to chain main, this build expected test',
      ),
    ).toBe(true);
    expect(isWalletFileError('Error: Config load: bad uri')).toBe(false);
    expect(isWalletFileError('Error: Lightclient is not initialized')).toBe(
      false,
    );
    expect(isWalletFileError('{"seed_phrase":"a"}')).toBe(false);
    expect(isWalletFileError('')).toBe(false);
    expect(isWalletFileError(null)).toBe(false);
  });
});

describe('wallet file recovery info', () => {
  test('parses a seed answer', () => {
    expect(
      parseWalletFileRecoveryInfo(
        JSON.stringify({
          seed_phrase: 'abandon about',
          ufvk: null,
          birthday: 419200,
          chain_name: 'test',
          format_version: 40,
        }),
      ),
    ).toEqual({
      seed_phrase: 'abandon about',
      ufvk: null,
      birthday: 419200,
      chain_name: 'test',
      format_version: 40,
    });
  });

  test('parses a viewing key answer', () => {
    const info = parseWalletFileRecoveryInfo(
      JSON.stringify({ seed_phrase: null, ufvk: 'uview1...', birthday: 7 }),
    );
    expect(info?.ufvk).toBe('uview1...');
    expect(info?.seed_phrase).toBeNull();
    expect(info?.birthday).toBe(7);
  });

  test('answers null for errors and malformed answers', () => {
    expect(
      parseWalletFileRecoveryInfo('Error: wallet file is empty'),
    ).toBeNull();
    expect(parseWalletFileRecoveryInfo('not json')).toBeNull();
    expect(
      parseWalletFileRecoveryInfo(JSON.stringify({ birthday: 'x' })),
    ).toBeNull();
    expect(
      parseWalletFileRecoveryInfo(
        JSON.stringify({ seed_phrase: null, ufvk: null, birthday: 1 }),
      ),
    ).toBeNull();
    expect(parseWalletFileRecoveryInfo(undefined)).toBeNull();
  });
});
