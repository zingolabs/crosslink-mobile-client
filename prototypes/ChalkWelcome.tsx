import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';

import { HeaderIconButton } from '../components/Header';
import Button from '../components/Components/Button';
import { useTheme } from '../app/theme';
import ChalkColumns, { ChalkColumnsProps } from './ChalkColumns';
import { Wordmark, WordmarkVariant } from './ChalkWordmark';
import { timeline } from './motion/timeline';
import { useTimeline } from './motion/useTimeline';

export type ChalkWelcomeProps = Omit<ChalkColumnsProps, 'reveal'> & {
  intro?: boolean;
  showHeader?: boolean;
  wordmark?: WordmarkVariant;
  actionButtonsDisabled?: boolean;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  openServers: () => void;
};

const LINE_ABOVE_TITLE = 22;
export const CHALK = '#e4e1d8';
const EDGE = 'rgba(0,0,0,0.22)';

const FINAL = { lights: 1, columns: 1, line: 1, rect: 0, flash: 0, title: 1 };

const ChalkWelcome: React.FC<ChalkWelcomeProps> = ({
  intro = true,
  showHeader = true,
  wordmark = 'system',
  actionButtonsDisabled = false,
  createNewWallet,
  getwalletToRestore,
  openServers,
  baseline = 0.3,
  colorChalk = CHALK,
  ...chalk
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [titleTop, setTitleTop] = useState(0);
  const tl = useMemo(
    () =>
      timeline()
        .to('lights', { duration: 2.8, ease: 'linear' })
        .to('columns', { duration: 1.1, ease: 'inQuart' }, '-=0.5')
        .to('line', { duration: 0.45, ease: 'outExpo' })
        .to('title', { duration: 0.7, ease: 'outQuad' }, '<')
        .to('flash', { from: 0, to: 1, duration: 0.05, ease: 'outExpo' }, '<')
        .to(
          'flash',
          { from: 1, to: 0, duration: 1.2, ease: 'outQuint' },
          '<+=0.05',
        ),
    [],
  );
  const { values } = useTimeline(tl, { autoplay: intro });
  const reveal = intro ? { ...values, rect: 0 } : FINAL;
  const ui = intro ? (values.title ?? 0) : 1;
  const measured =
    height > 0 && titleTop > 0
      ? (height - titleTop + LINE_ABOVE_TITLE) / height
      : baseline;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      onLayout={e => setHeight(e.nativeEvent.layout.height)}
    >
      <ChalkColumns
        {...chalk}
        colorChalk={colorChalk}
        baseline={measured}
        reveal={reveal}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {showHeader && (
          <HeaderIconButton
            icon={faNetworkWired}
            disabled={actionButtonsDisabled}
            onPress={openServers}
            accessibilityLabel="Change indexer"
            accessibilityHint="Choose the network and indexer this wallet uses"
          />
        )}
      </View>
      <View style={styles.body} />
      <View
        style={[styles.title, { opacity: ui }]}
        onLayout={e => setTitleTop(e.nativeEvent.layout.y)}
      >
        <Wordmark variant={wordmark} color={colorChalk} />
      </View>
      <View
        style={[
          styles.actions,
          { paddingBottom: Math.max(insets.bottom, 34) - 10, opacity: ui },
        ]}
      >
        <Button
          title="Create new wallet"
          disabled={actionButtonsDisabled}
          onPress={createNewWallet}
          style={[
            styles.primary,
            { backgroundColor: colorChalk, borderColor: EDGE },
          ]}
          textStyle={[styles.primaryLabel, { color: colors.bgCanvas }]}
        />
        <Button
          variant="ghost"
          title="Import wallet"
          disabled={actionButtonsDisabled}
          onPress={getwalletToRestore}
          style={styles.secondary}
          textStyle={[styles.secondaryLabel, { color: colors.fgMuted }]}
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
  title: {
    alignItems: 'center',
    marginBottom: 56,
  },
  actions: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  primary: { width: '100%', borderRadius: 6, borderWidth: 1 },
  secondary: { marginTop: 8 },
  primaryLabel: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  secondaryLabel: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});

export default ChalkWelcome;
