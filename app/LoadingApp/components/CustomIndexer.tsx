import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  CSSAnimationProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { ToastProvider, useToast } from 'react-native-toastier';

import { ChainNameEnum, RouteEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { LoadingAppStackParamList } from '../../types';
import { pingIndexerServer } from '../../selectingServer';
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
import Segmented from '../../../components/Components/Segmented';
import { HeaderTitle } from '../../../components/Header';
import { text, useTheme } from '../../theme';

type CustomIndexerProps = {
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  closeServers: () => void;
  initialNetwork?: ChainNameEnum;
};

type Network = ChainNameEnum.testChainName | ChainNameEnum.regtestChainName;

type Status =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'online' }
  | { state: 'offline' };

const DEBOUNCE_MS = 900;
const PROBE_TIMEOUT_MS = 3000;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const DEFAULT_PORT: Record<Network, string> = {
  [ChainNameEnum.testChainName]: '18234',
  [ChainNameEnum.regtestChainName]: '18232',
};

const CustomIndexer: React.FC<CustomIndexerProps> = ({
  setIndexerServer,
  closeServers,
  initialNetwork,
}) => {
  const { snackbars, removeFirstSnackbar } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const { clear } = useToast();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const navigation =
    useNavigation<NativeStackNavigationProp<LoadingAppStackParamList>>();
  const route =
    useRoute<RouteProp<LoadingAppStackParamList, RouteEnum.CustomIndexer>>();
  const screenName = ScreenEnum.Servers;

  const [network, setNetwork] = useState<Network>(
    (route.params?.network ?? initialNetwork) === ChainNameEnum.regtestChainName
      ? ChainNameEnum.regtestChainName
      : ChainNameEnum.testChainName,
  );
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [connecting, setConnecting] = useState(false);
  const runRef = useRef(0);

  const endpoint = parseEndpoint(value);
  const complete = isCompleteEndpoint(endpoint);
  const key = formatEndpoint(endpoint);

  const probe = useCallback(async () => {
    const e = parseEndpoint(value);
    if (!isCompleteEndpoint(e)) {
      return;
    }
    const run = ++runRef.current;
    setStatus({ state: 'checking' });
    const latency = await pingIndexerServer(endpointUri(e), PROBE_TIMEOUT_MS);
    if (run !== runRef.current) {
      return;
    }
    setStatus({ state: latency === null ? 'offline' : 'online' });
  }, [value]);

  useEffect(() => {
    runRef.current++;
    setStatus({ state: 'idle' });
    if (!complete) {
      return;
    }
    const t = setTimeout(probe, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    await setIndexerServer(endpointUri(endpoint), network);
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

        <View style={styles.segmented}>
          <Segmented<Network>
            options={[
              { value: ChainNameEnum.testChainName, label: 'Testnet' },
              { value: ChainNameEnum.regtestChainName, label: 'Regtest' },
            ]}
            value={network}
            onChange={setNetwork}
          />
        </View>

        <View style={styles.field}>
          <EndpointInput
            value={value}
            onChange={setValue}
            onSubmit={probe}
            placeholderPort={DEFAULT_PORT[network]}
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
              {`Could not reach ${key}.`}
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
  segmented: {
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  field: {
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
