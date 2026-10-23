/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, {
  CSSTransitionProperties,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  House,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanQrCode,
  Send,
  Settings,
  ShieldOff,
} from 'lucide-react-native';

import { ValueTransferType } from '../../app/AppState';
import { text, useTheme } from '../../app/theme';
import { useAppLoadedSettings, useAppLoadedWallet } from '../../app/context';
import { Feed, FeedItem, isPending, useFeed } from './feed';
import ArtLoop from './ArtLoop';
import { Incoming } from './data';
import {
  Amount,
  CSS_EASE_OUT,
  KindIcon,
  MASK,
  Pending,
  Row,
  RowSurface,
  EASE_OUT,
  byDay,
  clock,
  formatZec,
  isIncoming,
  label,
  styles,
  useMotion,
} from './shared';

/** Pre-rendered chalk shapes for the empty state, see art/generate.mjs. */
export const ART = {
  ring: require('./art/ring.png'),
  pair: require('./art/pair.png'),
  spiral: require('./art/spiral.png'),
  wave: require('./art/wave.png'),
  dashes: require('./art/dashes.png'),
  frame: require('./art/frame.png'),
  triangle: require('./art/triangle.png'),
  orbit: require('./art/orbit.png'),
  arcs: require('./art/arcs.png'),
  knot: require('./art/knot.png'),
} as const;
export type ArtKey = keyof typeof ART;
export const ART_KEYS = Object.keys(ART) as ArtKey[];

const EMPTY_IN = FadeIn.duration(240)
  .easing(EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.97 }] });
const EMPTY_OUT = FadeOut.duration(160);

/**
 * Nothing to list yet. Says what will appear and what makes it appear,
 * in the row's own visual language, so the first transaction lands into
 * a layout the eye already knows.
 */
const Empty: React.FC<{ bottomInset: number; art: ArtKey; fps?: number }> = ({
  bottomInset,
  art,
  fps,
}) => {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={EMPTY_IN}
      exiting={EMPTY_OUT}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: PANEL.radius,
        paddingBottom: bottomInset,
      }}
    >
      <View style={{ marginBottom: 4 }}>
        <ArtLoop art={art} still={art === 'orbit'} fps={fps} />
      </View>
      <Text style={[text.headline, { color: colors.fgDefault }]}>
        No transactions yet
      </Text>
      <Text
        style={[
          text.subheadline,
          {
            color: colors.fgSubtle,
            textAlign: 'center',
            marginTop: 4,
            maxWidth: 260,
          },
        ]}
      >
        They show up here as soon as you receive or send ZEC.
      </Text>
    </Animated.View>
  );
};

/**
 * The transaction list. One row per movement: what happened, when, how
 * much. Grouped by day. A pending row shows the loader where the time
 * goes until the network confirms it.
 */
const List: React.FC<{
  items: FeedItem[];
  mountedAt: number;
  bottomInset: number;
  art: ArtKey;
  fps?: number;
  onPress: (vt: ValueTransferType) => void;
}> = ({ items, mountedAt, bottomInset, art, fps, onPress }) => {
  const { colors } = useTheme();
  const motion = useMotion();
  let index = 0;
  if (items.length === 0) {
    return <Empty bottomInset={bottomInset} art={art} fps={fps} />;
  }
  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: PANEL.radius,
        paddingBottom: bottomInset,
      }}
    >
      {byDay(items).map(section => (
        <View key={section.key}>
          <Text
            style={[
              text.footnote,
              {
                color: colors.fgSubtle,
                fontWeight: '600',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 6,
              },
            ]}
          >
            {section.title}
          </Text>
          {section.items.map((it, i) => {
            const slot = index++;
            const amountColor = isIncoming(it)
              ? colors.fgSuccess
              : colors.fgDefault;
            return (
              <Row
                key={it.txid}
                item={it}
                index={slot}
                motion={motion}
                mountedAt={mountedAt}
              >
                <RowSurface
                  item={it}
                  motion={motion}
                  onPress={() => onPress(it)}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      height: 60,
                      paddingHorizontal: 20,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.bgSurface,
                      }}
                    >
                      <KindIcon vt={it} color={colors.fgDefault} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[text.body, { color: colors.fgDefault }]}>
                        {label(it)}
                      </Text>
                      {isPending(it) ? (
                        <Pending />
                      ) : (
                        <Text
                          style={[text.footnote, { color: colors.fgSubtle }]}
                        >
                          {clock(it)}
                        </Text>
                      )}
                    </View>
                    <Amount vt={it} color={amountColor} />
                  </View>
                  {i < section.items.length - 1 && (
                    <View style={[styles.hairline, { marginLeft: 68 }]} />
                  )}
                </RowSurface>
              </Row>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

/**
 * The summary panel from the 0xramp reference app: a raised card with a
 * continuous-corner bottom edge that the list scrolls under. Balance in
 * 56pt tabular bold with the unit set small and muted, the unshielded
 * amount beneath it, and three circular actions, the first one prominent.
 */
const PANEL = {
  radius: 28,
  raised: '#1C1C1E',
  raisedShade: '#161618',
  shadow: '0 6px 16px -10px rgba(0, 0, 0, 0.45)',
  controlFill: '#2C2C2E',
  accent: '#239B56',
  text: '#F5F5F7',
  textMuted: '#98989F',
};

const HEADER_H = 44;

const press: CSSTransitionProperties = {
  transitionProperty: ['transform'],
  transitionDuration: 120,
  transitionTimingFunction: CSS_EASE_OUT,
};

const IconAction: React.FC<{
  title: string;
  icon: React.ReactNode;
  prominent?: boolean;
  onPress?: () => void;
}> = ({ title, icon, prominent = false, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={onPress}
    hitSlop={{ top: 8, left: 8, right: 8, bottom: 32 }}
    pressRetentionOffset={16}
    style={{ width: 72, alignItems: 'center', gap: 8 }}
  >
    {({ pressed }) => (
      <>
        <Animated.View
          style={[
            {
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: prominent ? PANEL.accent : PANEL.controlFill,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            press,
          ]}
        >
          {icon}
        </Animated.View>
        <Text style={{ fontSize: 13, fontWeight: '500', color: PANEL.text }}>
          {title}
        </Text>
      </>
    )}
  </Pressable>
);

const Summary: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { privacy } = useAppLoadedSettings();
  const { totalBalance, syncingStatus } = useAppLoadedWallet();
  const pct =
    syncingStatus?.percentage_total_outputs_scanned ||
    syncingStatus?.percentage_total_blocks_scanned ||
    0;
  const settled = pct >= 100;
  const spendable = totalBalance?.totalSpendableBalance ?? 0;
  const unshielded = totalBalance?.totalTransparentBalance ?? 0;
  const gradient = `linear-gradient(to bottom, ${PANEL.raised}, ${PANEL.raisedShade})`;
  const icon = { size: 22, strokeWidth: 2.2, color: PANEL.text };

  return (
    <View
      style={{
        zIndex: 1,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: insets.top + HEADER_H + 20,
        paddingBottom: 32,
        borderBottomLeftRadius: PANEL.radius,
        borderBottomRightRadius: PANEL.radius,
        borderCurve: 'continuous',
        backgroundColor: PANEL.raised,
        boxShadow: PANEL.shadow,
        ...(Platform.OS === 'web'
          ? ({ backgroundImage: gradient } as object)
          : { experimental_backgroundImage: gradient }),
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={8}
        style={{
          position: 'absolute',
          top: insets.top,
          right: 16,
          width: HEADER_H,
          height: HEADER_H,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Settings size={24} strokeWidth={2} color={PANEL.text} />
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ width: 28 }} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            flexShrink: 1,
            fontSize: 56,
            lineHeight: 64,
            fontWeight: '700',
            letterSpacing: -1.5,
            fontVariant: ['tabular-nums'],
            color: PANEL.text,
            opacity: settled ? 1 : 0.4,
          }}
        >
          {privacy ? MASK : formatZec(spendable)}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              letterSpacing: 0,
              color: PANEL.textMuted,
            }}
          >
            {' ZEC'}
          </Text>
        </Text>
        <View style={{ width: 28, alignItems: 'center' }}>
          {!settled && <ActivityIndicator color={PANEL.textMuted} />}
        </View>
      </View>

      {unshielded > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 2,
          }}
        >
          <ShieldOff size={13} strokeWidth={2.4} color={PANEL.textMuted} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              fontVariant: ['tabular-nums'],
              color: PANEL.textMuted,
            }}
          >
            {privacy ? MASK : formatZec(unshielded)}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 20, marginTop: 24 }}>
        <IconAction title="Add" icon={<Plus {...icon} />} prominent />
        <IconAction title="Receive" icon={<ScanQrCode {...icon} />} />
        <IconAction title="Send" icon={<Send {...icon} />} />
      </View>
    </View>
  );
};

const TAB_H = 64;

/** The floating tab pill, the list scrolls underneath it. */
const TabBar: React.FC<{ bottom: number }> = ({ bottom }) => {
  const { colors } = useTheme();
  const tab = (name: string, icon: React.ReactNode, active: boolean) => (
    <View
      style={{
        height: TAB_H - 8,
        minWidth: 92,
        paddingHorizontal: 18,
        borderRadius: (TAB_H - 8) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        backgroundColor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      }}
    >
      {icon}
      <Text
        style={[
          text.caption2,
          {
            color: active ? colors.fgAccent : colors.fgSubtle,
            fontWeight: '600',
          },
        ]}
      >
        {name}
      </Text>
    </View>
  );
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottom + 12,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: 4,
          height: TAB_H,
          borderRadius: TAB_H / 2,
          backgroundColor: 'rgba(28, 28, 30, 0.86)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          ...(Platform.OS === 'web'
            ? ({ backdropFilter: 'blur(16px) saturate(1.4)' } as object)
            : null),
        }}
      >
        {tab(
          'Home',
          <House size={22} color={colors.fgAccent} strokeWidth={2} />,
          true,
        )}
        {tab(
          'Staking',
          <Layers size={22} color={colors.fgSubtle} strokeWidth={2} />,
          false,
        )}
      </View>
    </View>
  );
};

/** The Home screen with the list in it. */
export const TxListScreen: React.FC<{
  feed: Feed;
  art?: ArtKey;
  fps?: number;
}> = ({ feed, art = 'orbit', fps }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mountedAt = useMemo(() => Date.now(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const onPress = useCallback(
    (vt: ValueTransferType) => setSelected(vt.txid),
    [],
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <Summary />
      <View style={{ flex: 1, marginTop: -PANEL.radius }}>
        <List
          items={feed.items}
          mountedAt={mountedAt}
          bottomInset={insets.bottom + TAB_H + 24}
          art={art}
          fps={fps}
          onPress={onPress}
        />
      </View>
      <TabBar bottom={insets.bottom} />
      {!!selected && (
        <Pressable
          onPress={() => setSelected(null)}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + TAB_H + 24,
            borderRadius: 14,
            backgroundColor: colors.bgSurface,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={[text.footnote, { color: colors.fgMuted }]}>
            Tapped {selected.slice(0, 10)}… — the real app opens the detail
            here.
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const BAR_CSS = `
.tx-bar {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  background: rgba(14, 14, 15, 0.86);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.09) inset, 0 10px 30px rgba(0,0,0,0.35);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}
.tx-bar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255,255,255,0.82);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease-out, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
}
.tx-bar button:hover { background: rgba(255,255,255,0.08); }
.tx-bar button:active { transform: scale(0.96); }
.tx-bar button[data-on] { background: #1c78d2; color: #fff; }
.tx-bar kbd { font: inherit; font-size: 11px; color: rgba(255,255,255,0.4); }
.tx-bar .sep { width: 1px; height: 18px; background: rgba(255,255,255,0.12); margin: 0 3px; }
`;

/**
 * Web toolbar that drives the feed: simulate incoming transactions and
 * confirmations so the arrival and settle animations can be watched.
 * Keys: R receive, S send, K stake, C confirm, A auto, 0 reset.
 */
export const FeedControls: React.FC<{ feed: Feed }> = ({ feed }) => {
  const feedRef = useRef(feed);
  feedRef.current = feed;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const f = feedRef.current;
      const map: Record<string, () => void> = {
        r: () => f.push('receive'),
        s: () => f.push('send'),
        k: () => f.push('stake'),
        c: () => f.confirmNext(),
        a: () => f.setAuto(!f.auto),
        '0': () => f.reset(),
      };
      const run = map[e.key.toLowerCase()];
      if (run) {
        e.preventDefault();
        run();
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  const act = (what: Incoming) => () => feed.push(what);
  const icon = { size: 14, strokeWidth: 2.2, color: 'currentColor' };

  return (
    <>
      <style>{BAR_CSS}</style>
      <div className="tx-bar" role="toolbar" aria-label="Simulate transactions">
        <button onClick={act('receive')}>
          Receive <kbd>R</kbd>
        </button>
        <button onClick={act('send')}>
          Send <kbd>S</kbd>
        </button>
        <button onClick={act('stake')}>
          Stake <kbd>K</kbd>
        </button>
        <span className="sep" />
        <button onClick={feed.confirmNext}>
          <Check {...icon} /> Confirm <kbd>C</kbd>
        </button>
        <button
          onClick={() => feed.setAuto(!feed.auto)}
          data-on={feed.auto ? '' : undefined}
        >
          {feed.auto ? <Pause {...icon} /> : <Play {...icon} />} Auto{' '}
          <kbd>A</kbd>
        </button>
        <button onClick={feed.reset} aria-label="Reset">
          <RotateCcw {...icon} /> <kbd>0</kbd>
        </button>
      </div>
    </>
  );
};

const TxList: React.FC<{ empty?: boolean; art?: ArtKey; fps?: number }> = ({
  empty = false,
  art = 'orbit',
  fps,
}) => {
  const feed = useFeed(empty);
  return (
    <>
      <TxListScreen feed={feed} art={art} fps={fps} />
      <FeedControls feed={feed} />
    </>
  );
};

export default TxList;
