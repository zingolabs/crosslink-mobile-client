import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { CopyIcon } from '../../Components/Icons/CopyIcon';
import { mono, space, text, useTheme } from '../../../app/theme';

type AddressCopyRowProps = {
  address: string;
  // Fires after the address was copied, for snackbar/display handling.
  onCopied: () => void;
};

// Bech32 human-readable part: everything up to and including the first
// "1" ("utest1", "u1", "ztestsapling1", ...). Shown in accent color.
const addressPrefix = (address: string): string => {
  const idx = address.indexOf('1');
  return idx > 0 ? address.slice(0, idx + 1) : '';
};

// Prefix + 6 chars + ellipsis + 6 chars. Short addresses render in full.
const shortenedAddress = (address: string): string => {
  const prefix = addressPrefix(address);
  const rest = address.slice(prefix.length);
  if (rest.length <= 12) {
    return rest;
  }
  return `${rest.slice(0, 6)}...${rest.slice(-6)}`;
};

// One-line address with an inline copy action. Deliberately compact:
// tapping it copies, that's the whole interaction.
const AddressCopyRow: React.FunctionComponent<AddressCopyRowProps> = ({
  address,
  onCopied,
}) => {
  const { colors } = useTheme();

  const doCopy = () => {
    Clipboard.setString(address);
    onCopied();
  };

  const prefix = addressPrefix(address);

  return (
    <View style={[styles.row, { backgroundColor: colors.bgSurface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="copy"
        onPress={doCopy}
        style={styles.addressHit}
      >
        <Text
          style={[styles.address, { color: colors.fgMuted }]}
          numberOfLines={1}
        >
          {prefix ? (
            <Text style={[styles.prefix, { color: colors.fgAccent }]}>
              {prefix}
            </Text>
          ) : null}
          {/* Tiny visual gap between prefix and body, not a character. */}
          <Text style={styles.gap}>{' '}</Text>
          <Text>{shortenedAddress(address)}</Text>
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="copy"
        onPress={doCopy}
        style={styles.copyHit}
      >
        <CopyIcon color={colors.fgMuted} size={18} opacity={0.9} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginTop: space.lg,
    marginHorizontal: space.xl,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressHit: {
    flexShrink: 1,
  },
  address: {
    ...text.body,
    ...mono,
  },
  prefix: {
    ...text.body,
  },
  gap: {
    fontSize: (text.body.fontSize ?? 16) * 0.4,
  },
  copyHit: {
    paddingLeft: space.sm,
    paddingVertical: space.xs,
  },
});

export default AddressCopyRow;
