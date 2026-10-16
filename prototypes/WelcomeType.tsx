/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';

import { HeaderIconButton } from '../components/Header';
import Button from '../components/Components/Button';
import LiquidPrimaryButton from '../components/Components/LiquidButton/LiquidPrimaryButton';
import { fontFamily, useTheme } from '../app/theme';
import VaporSun from './VaporSun';

export const welcomeVariants = [
  'octave',
  'rounds',
  'ledger',
  'editorial',
  'stack',
  'whisper',
  'glyph',
  'spine',
] as const;
export type WelcomeVariant = (typeof welcomeVariants)[number];

export type WelcomeTypeProps = {
  variant: WelcomeVariant;
  background: 'flat' | 'vaporSun';
  actionButtonsDisabled?: boolean;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  openServers: () => void;
};

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

const WelcomeType: React.FC<WelcomeTypeProps> = ({
  variant,
  background,
  actionButtonsDisabled = false,
  createNewWallet,
  getwalletToRestore,
  openServers,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const c = colors;

  const hero = () => {
    switch (variant) {
      case 'octave':
        return (
          <View style={styles.bottomLeft}>
            <Text
              style={{
                color: c.fgSubtle,
                fontSize: 16,
                fontWeight: '300',
                letterSpacing: 6,
              }}
            >
              ZINGO
            </Text>
            <Text
              style={{
                color: c.fgDefault,
                fontSize: 64,
                lineHeight: 64,
                fontWeight: '800',
                letterSpacing: -2.5,
                marginTop: 8,
              }}
            >
              delegator
            </Text>
            <Text
              style={{
                color: c.fgMuted,
                fontSize: 32,
                lineHeight: 36,
                fontWeight: '300',
                marginTop: 4,
              }}
            >
              your shielded wallet
            </Text>
          </View>
        );
      case 'rounds':
        return (
          <View style={styles.centerLeft}>
            <Text
              style={{
                color: c.fgDefault,
                fontFamily: serif,
                fontSize: 72,
                lineHeight: 76,
                letterSpacing: -1,
              }}
            >
              Hello.
            </Text>
            <Text
              style={{
                color: c.fgMuted,
                fontFamily: serif,
                fontSize: 22,
                lineHeight: 30,
                marginTop: 12,
              }}
            >
              Your Zcash, shielded and{'\n'}delegated the way you choose.
            </Text>
          </View>
        );
      case 'ledger':
        return (
          <View style={styles.centerLeft}>
            <Text
              style={{
                color: c.fgSubtle,
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 2,
                lineHeight: 20,
              }}
            >
              ZINGO DELEGATOR{'\n'}BUILD 0.0.1 · MAINNET
            </Text>
            <Text
              style={{
                color: c.fgDefault,
                fontFamily: fontFamily.mono,
                fontSize: 40,
                lineHeight: 48,
                marginTop: 24,
              }}
            >
              ready_
            </Text>
            <Text
              style={{
                color: c.fgFaint,
                fontFamily: fontFamily.mono,
                fontSize: 12,
                letterSpacing: 2,
                lineHeight: 20,
                marginTop: 24,
              }}
            >
              NO WALLET FOUND{'\n'}CREATE OR IMPORT TO BEGIN
            </Text>
          </View>
        );
      case 'editorial':
        return (
          <View style={styles.centerCentered}>
            <Text
              style={{
                color: c.fgSubtle,
                fontSize: 11,
                letterSpacing: 4,
                fontWeight: '500',
              }}
            >
              ZINGO DELEGATOR
            </Text>
            <Text
              style={{
                color: c.fgDefault,
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 44,
                lineHeight: 52,
                textAlign: 'center',
                marginTop: 20,
              }}
            >
              Delegate,{'\n'}privately.
            </Text>
            <View
              style={{
                width: 24,
                height: 1,
                backgroundColor: c.borderFaint,
                marginTop: 24,
              }}
            />
          </View>
        );
      case 'stack':
        return (
          <View style={styles.centerCentered}>
            <Text
              style={{
                color: c.fgMuted,
                fontSize: 24,
                fontWeight: '200',
                letterSpacing: 8,
              }}
            >
              YOUR
            </Text>
            <Text
              style={{
                color: c.fgDefault,
                fontSize: 48,
                lineHeight: 56,
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              SHIELDED
            </Text>
            <Text
              style={{
                color: c.fgMuted,
                fontSize: 24,
                fontWeight: '200',
                letterSpacing: 8,
              }}
            >
              WALLET
            </Text>
          </View>
        );
      case 'whisper':
        return (
          <View style={styles.bottomLeft}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: c.fgDefault,
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                color: c.fgDefault,
                fontSize: 15,
                fontWeight: '500',
                letterSpacing: 0.2,
              }}
            >
              Zingo Delegator
            </Text>
            <Text
              style={{
                color: c.fgSubtle,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              A shielded Zcash wallet.
            </Text>
          </View>
        );
      case 'glyph':
        return (
          <>
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -40,
                top: -30,
                color: c.bgSurface,
                fontSize: 420,
                lineHeight: 420,
                fontWeight: '900',
                letterSpacing: -20,
              }}
            >
              Z
            </Text>
            <View style={styles.bottomLeft}>
              <Text
                style={{
                  color: c.fgDefault,
                  fontSize: 34,
                  lineHeight: 40,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                Zingo{'\n'}Delegator
              </Text>
              <Text
                style={{
                  color: c.fgSubtle,
                  fontSize: 15,
                  lineHeight: 20,
                  marginTop: 8,
                }}
              >
                Shielded Zcash. Delegation in your hands.
              </Text>
            </View>
          </>
        );
      case 'spine':
        return (
          <>
            <View
              style={{
                position: 'absolute',
                left: -6,
                top: 120,
                bottom: 160,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: c.fgDefault,
                  fontSize: 56,
                  fontWeight: '800',
                  letterSpacing: 2,
                  transform: [{ rotate: '-90deg' }],
                  width: 600,
                  marginLeft: -270,
                  textAlign: 'center',
                }}
              >
                DELEGATOR
              </Text>
            </View>
            <View style={[styles.bottomLeft, { paddingLeft: 88 }]}>
              <Text
                style={{
                  color: c.fgSubtle,
                  fontSize: 12,
                  letterSpacing: 3,
                  fontWeight: '500',
                }}
              >
                ZINGO
              </Text>
              <Text
                style={{
                  color: c.fgMuted,
                  fontSize: 17,
                  lineHeight: 24,
                  marginTop: 8,
                }}
              >
                Shielded Zcash,{'\n'}your keys, your rules.
              </Text>
            </View>
          </>
        );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bgCanvas }]}>
      {background === 'vaporSun' && <VaporSun canvas={c.bgCanvas} />}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <HeaderIconButton
          icon={faNetworkWired}
          disabled={actionButtonsDisabled}
          onPress={openServers}
          accessibilityLabel="Change indexer"
          accessibilityHint="Choose the network and indexer this wallet uses"
        />
      </View>
      <View style={styles.body}>{hero()}</View>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          testID="loadingapp.restorewallet"
          variant="ghost"
          title="Import wallet"
          disabled={actionButtonsDisabled}
          onPress={getwalletToRestore}
        />
        <LiquidPrimaryButton
          title="Create new wallet"
          disabled={actionButtonsDisabled}
          onPress={createNewWallet}
          style={styles.primary}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 48,
    marginTop: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  body: { flexGrow: 1 },
  bottomLeft: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  centerLeft: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centerCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actions: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  primary: { marginTop: 10, marginBottom: 10, width: '100%' },
});

export default WelcomeType;
