/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import moment from 'moment';
import { BatteryFull, Wifi } from 'lucide-react-native';

import { useTheme } from '../../app/theme';
import { VariantActions } from './shared';
import Split from './Split';
import Status from './Status';
import Trends from './Trends';
import Earn from './Earn';
import Month from './Month';
import Glance from './Glance';

const W = 1194;
const H = 834;
const BEZEL = 14;
const INSET_TOP = 74;

const VARIANTS = [
  { name: 'Split', C: Split },
  { name: 'Status', C: Status },
  { name: 'Trends', C: Trends },
  { name: 'Earn', C: Earn },
  { name: 'Month', C: Month },
  { name: 'Glance', C: Glance },
];

const PICKER_CSS = `
.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}

.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}

.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}

.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease-out;
}

.proto-picker-item:hover {
  color: rgba(255, 255, 255, 0.85);
}

.proto-picker-item:active {
  transform: scale(0.97);
}

.proto-picker-item:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}

.proto-picker-item[data-active] {
  color: #fff;
}

.proto-picker-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
}

.proto-picker-replay {
  padding: 0 10px;
  font-size: 14px;
}

.proto-picker[data-position="top"] {
  bottom: auto;
  top: 24px;
}
`;

const initialIndex = () => {
  if (typeof location === 'undefined') {
    return 0;
  }
  const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10);
  return v >= 1 && v <= VARIANTS.length ? v - 1 : 0;
};

const Picker: React.FC<{ current: number; onPick: (i: number) => void }> = ({
  current,
  onPick,
}) => {
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const place = useCallback(() => {
    const el = items.current[current];
    if (!el || !highlight.current) {
      return;
    }
    highlight.current.style.width = `${el.offsetWidth}px`;
    highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [place]);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => nav.current?.setAttribute('data-ready', '')),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{PICKER_CSS}</style>
      <nav ref={nav} className="proto-picker" aria-label="Prototype variants">
        <span
          ref={highlight}
          className="proto-picker-highlight"
          aria-hidden="true"
        />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={el => {
              items.current[i] = el;
            }}
            className="proto-picker-item"
            data-active={i === current ? '' : undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => onPick(i)}
          >
            {v.name}
          </button>
        ))}
      </nav>
    </>
  );
};

const StatusBar: React.FC = () => {
  const { colors } = useTheme();
  const [now, setNow] = useState(moment());
  useEffect(() => {
    const t = setInterval(() => setNow(moment()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 24,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{ color: colors.fgDefault, fontSize: 13, fontWeight: '600' }}
      >
        {now.format('h:mm')}
        <Text
          style={{ fontWeight: '500' }}
        >{`  ${now.format('ddd MMM D')}`}</Text>
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Wifi size={15} color={colors.fgDefault} strokeWidth={2.4} />
        <Text
          style={{ color: colors.fgDefault, fontSize: 13, fontWeight: '500' }}
        >
          100%
        </Text>
        <BatteryFull size={22} color={colors.fgDefault} strokeWidth={1.8} />
      </View>
    </View>
  );
};

const TabBar: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        top: 28,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: 3,
          borderRadius: 20,
          backgroundColor: '#1f1f21e6',
          borderWidth: 1,
          borderColor: '#ffffff12',
        }}
      >
        <View
          style={{
            height: 32,
            paddingHorizontal: 18,
            borderRadius: 16,
            justifyContent: 'center',
            backgroundColor: '#ffffff1f',
          }}
        >
          <Text
            style={{ color: colors.fgDefault, fontSize: 14, fontWeight: '600' }}
          >
            Home
          </Text>
        </View>
        <View
          style={{
            height: 32,
            paddingHorizontal: 18,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: colors.fgSubtle, fontSize: 14, fontWeight: '500' }}
          >
            Staking
          </Text>
        </View>
      </View>
    </View>
  );
};

const HistoryTablet: React.FC<VariantActions> = actions => {
  const { colors } = useTheme();
  const win = useWindowDimensions();
  const [current, setCurrent] = useState(initialIndex);
  const [mount, setMount] = useState(0);

  const pick = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) {
      return;
    }
    setCurrent(i);
    setMount(m => m + 1);
    const url = new URL(location.href);
    url.searchParams.set('v', String(i + 1));
    history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) {
        pick(n - 1);
      } else if (e.key === 'ArrowRight') {
        pick((current + 1) % VARIANTS.length);
      } else if (e.key === 'ArrowLeft') {
        pick((current - 1 + VARIANTS.length) % VARIANTS.length);
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [current, pick]);

  const outerW = W + BEZEL * 2;
  const outerH = H + BEZEL * 2;
  const scale = Math.min(
    1,
    (win.width - 48) / outerW,
    (win.height - 48 - 72) / outerH,
  );
  const { C } = VARIANTS[current];

  return (
    <View
      style={{
        position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a1b',
        alignItems: 'center',
        paddingTop: 24,
      }}
    >
      <View style={{ width: outerW * scale, height: outerH * scale }}>
        <View
          style={{
            position: 'absolute',
            width: outerW,
            height: outerH,
            left: (outerW * scale - outerW) / 2,
            top: (outerH * scale - outerH) / 2,
            transform: [{ scale }],
            padding: BEZEL,
            borderRadius: 36,
            backgroundColor: '#050505',
            borderWidth: 1,
            borderColor: '#ffffff1a',
          }}
        >
          <View
            style={{
              width: W,
              height: H,
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: colors.bgCanvas,
            }}
          >
            <C key={mount} insetTop={INSET_TOP} {...actions} />
            <StatusBar />
            <TabBar />
          </View>
        </View>
      </View>
      <Picker current={current} onPick={pick} />
    </View>
  );
};

export default HistoryTablet;
