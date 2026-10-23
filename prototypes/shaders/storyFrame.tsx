import React from 'react';
import { StyleSheet, View } from 'react-native';

import { tokens } from '../../app/theme/tokens';
import Button from '../../components/Components/Button';
import LiquidPrimaryButton from '../../components/Components/LiquidButton/LiquidPrimaryButton';

export const range = (min: number, max: number, step: number) => ({
  control: { type: 'range' as const, min, max, step },
});

export const colorArgTypes = (count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `color${i + 1}`,
      { control: 'color' },
    ]),
  );

export const pickColors = (args: Record<string, unknown>, count: number) =>
  Array.from({ length: count }, (_, i) => args[`color${i + 1}`]).filter(
    (c): c is string => typeof c === 'string' && c.length > 0,
  );

export const neutral = {
  back: tokens.bgCanvas,
  ink: '#000000',
  surface: tokens.bgSurface,
  faint: tokens.fgFaint,
  subtle: tokens.fgSubtle,
  muted: tokens.fgMuted,
  white: tokens.fgDefault,
};

export const Frame: React.FC<{
  withButtons: boolean;
  children: React.ReactNode;
}> = ({ withButtons, children }) => (
  <View style={styles.root}>
    {children}
    {withButtons && (
      <View style={styles.actions}>
        <Button variant="ghost" title="Import wallet" onPress={() => {}} />
        <LiquidPrimaryButton
          title="Create new wallet"
          onPress={() => {}}
          style={styles.primary}
        />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  actions: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  primary: { marginTop: 10, width: '100%' },
});
