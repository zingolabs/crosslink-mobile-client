import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  CSSAnimationProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { ToastProvider, useToast } from 'react-native-toastier';

import { ChainNameEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { LoadingAppStackParamList } from '../../types';
import { Probe, probeIndexer } from '../../indexers';
import {
  endpointUri,
  formatEndpoint,
  isCompleteEndpoint,
  parseEndpoint,
} from '../../utils/endpoint';
import Snackbars from '../../../components/Components/Snackbars';
import BlurInText from '../../../components/Components/BlurInText';
import EndpointInput from '../../../components/Components/EndpointInput';
import JellyLoader from '../../../components/Components/Icons/JellyLoader';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { HeaderTitle } from '../../../components/Header';
import { text, useTheme } from '../../theme';

type CustomIndexerProps = {
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  closeServers: () => void;
  probe?: Probe;
};

type Status =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'online'; latencyMs: number }
  | { state: 'offline' };

const DEBOUNCE_MS = 900;
const DEFAULT_PORT = '18234';
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const CustomIndexer: React.FC<CustomIndexerProps> = ({
  setIndexerServer,
  closeServers,
  probe = probeIndexer,
}) => {
  const { snackbars, removeFirstSnackbar } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const { clear } = useToast();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const navigation =
    useNavigation<NativeStackNavigationProp<LoadingAppStackParamList>>();
  const screenName = ScreenEnum.Servers;

  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [connecting, setConnecting] = useState(false);
  const runRef = useRef(0);

  const endpoint = parseEndpoint(value);
  const complete = isCompleteEndpoint(endpoint);
  const key = formatEndpoint(endpoint);

  const check = useCallback(async () => {
    const e = parseEndpoint(value);
    if (!isCompleteEndpoint(e)) {
      return;
    }
    const run = ++runRef.current;
    setStatus({ state: 'checking' });
    const found = await probe(endpointUri(e));
    if (run !== runRef.current) {
      return;
    }
    setStatus(
      found ? { state: 'online', latencyMs: found.latencyMs } : { state: 'offline' },
    );
  }, [value, probe]);

  const checkRef = useRef(check);
  checkRef.current = check;

  useEffect(() => {
    runRef.current++;
    setStatus({ state: 'idle' });
    if (!complete) {
      return;
    }
    const t = setTimeout(() => checkRef.current(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [key, complete]);

  const goBack = () => {
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      closeServers();
    }
  };

  const onContinue = async () => {
    if (connecting || status.state !== 'online') {
      return;
    }
    setConnecting(true);
    Keyboard.dismiss();
    clear();
    await setIndexerServer(endpointUri(endpoint), ChainNameEnum.testChainName);
    closeServers();
  };

  const materialize: CSSAnimationProperties = {
    animationName: {
      from: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.92 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    },
    animationDuration: reducedMotion ? 0 : 450,
    animationTimingFunction: EASE_OUT,
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <HeaderTitle title="Custom indexer" goBack={goBack} />

        <View style={styles.field}>
          <EndpointInput
            value={value}
            onChange={setValue}
            onSubmit={check}
            placeholderPort={DEFAULT_PORT}
            error={status.state === 'offline'}
            editable={!connecting}
          />
        </View>

        <View style={styles.status}>
          {status.state === 'checking' ? (
            <JellyLoader size={18} />
          ) : status.state === 'offline' ? (
            <BlurInText
              containerStyle={styles.statusWrap}
              style={[styles.statusText, { color: colors.fgDanger }]}
              accessibilityLiveRegion="polite"
            >
              {`${key} does not serve this chain.`}
            </BlurInText>
          ) : status.state === 'online' ? (
            <BlurInText
              containerStyle={styles.statusWrap}
              style={[styles.statusText, { color: colors.fgSubtle }]}
              accessibilityLiveRegion="polite"
            >
              {`${status.latencyMs} ms`}
            </BlurInText>
          ) : null}
        </View>

        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {status.state === 'online' && (
            <Animated.View key="continue" style={[styles.action, materialize]}>
              <LiquidPrimaryButton
                title="Continue"
                disabled={connecting}
                onPress={onContinue}
                style={styles.stretch}
              />
            </Animated.View>
          )}
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  field: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  status: {
    minHeight: 28,
    marginTop: 10,
    marginHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusWrap: {
    flex: 1,
  },
  statusText: {
    ...text.footnote,
  },
  actions: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 50,
  },
  action: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  stretch: {
    alignSelf: 'stretch',
  },
});

export default CustomIndexer;
