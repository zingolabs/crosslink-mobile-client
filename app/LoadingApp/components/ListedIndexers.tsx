import React, { useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  CSSAnimationProperties,
  CSSTransitionProperties,
  Easing,
  LinearTransition,
  ReduceMotion,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ToastProvider, useToast } from 'react-native-toastier';

import { ChainNameEnum, RouteEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { LoadingAppStackParamList } from '../../types';
import { Indexer, IndexerList } from '../../utils/Utils';
import { Probe, useIndexerProbes } from '../hooks/useIndexerProbes';
import Snackbars from '../../../components/Components/Snackbars';
import { HeaderTitle } from '../../../components/Header';
import BlurInText from '../../../components/Components/BlurInText';
import JellyLoader from '../../../components/Components/Icons/JellyLoader';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { radiusPill, text, useTheme } from '../../theme';

export type ListedIndexersProps = {
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  indexerList: IndexerList;
  closeServers: () => void;
  previousServer?: string;
  pingServer?: (uri: string) => Promise<number | null>;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const ROW_LAYOUT = LinearTransition.duration(350)
  .easing(Easing.bezier(0.77, 0, 0.175, 1))
  .reduceMotion(ReduceMotion.System);

const hostOf = (url: string) => {
  try {
    return new URL(url.includes('://') ? url : `http://${url}`).hostname;
  } catch {
    return url;
  }
};

type IndexerRowProps = {
  item: Indexer;
  probe: Probe;
  selected: boolean;
  onPress: () => void;
};

const IndexerRow: React.FC<IndexerRowProps> = ({
  item,
  probe,
  selected,
  onPress,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const offline = probe.state === 'offline';

  const check: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : '200ms',
    transitionTimingFunction: EASE_OUT,
  };

  const detail =
    probe.state === 'online'
      ? `${probe.latency} ms`
      : probe.state === 'offline'
        ? 'Unreachable'
        : '';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${hostOf(item.url)}${detail ? `, ${detail}` : ''}`}
      accessibilityState={{ selected, disabled: offline }}
      disabled={offline}
      onPress={onPress}
      pressRetentionOffset={16}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            { backgroundColor: colors.bgSurface },
            pressed && styles.rowPressed,
            offline && styles.rowOffline,
          ]}
        >
          <Text
            style={[styles.rowTitle, { color: colors.fgDefault }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {hostOf(item.url)}
          </Text>

          {probe.state === 'checking' ? (
            <View style={styles.rowValue}>
              <JellyLoader size={20} />
            </View>
          ) : (
            <BlurInText
              style={[
                styles.rowValue,
                { color: offline ? colors.fgDanger : colors.fgSubtle },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.6}
            >
              {detail}
            </BlurInText>
          )}

          <Animated.View
            style={[
              styles.check,
              check,
              reducedMotion
                ? selected
                  ? styles.visible
                  : styles.hidden
                : selected
                  ? styles.checkOn
                  : styles.checkOff,
            ]}
          >
            <FontAwesomeIcon icon={faCheck} size={16} color={colors.fgAccent} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
};

const Separator = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.separatorRow, { backgroundColor: colors.bgSurface }]}>
      <View
        style={[styles.separator, { backgroundColor: colors.borderFaint }]}
      />
    </View>
  );
};

const ListedIndexers: React.FC<ListedIndexersProps> = ({
  setIndexerServer,
  indexerList,
  closeServers,
  previousServer,
  pingServer,
}) => {
  const { snackbars, removeFirstSnackbar } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clear } = useToast();
  const reducedMotion = useReducedMotion();
  const navigation =
    useNavigation<NativeStackNavigationProp<LoadingAppStackParamList>>();
  const route =
    useRoute<RouteProp<LoadingAppStackParamList, RouteEnum.ListedIndexers>>();
  const screenName = ScreenEnum.Servers;

  const { probes, ordered, online, settled, fastest, probeAll } =
    useIndexerProbes(indexerList, pingServer, route.params?.probes);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    indexerList.some(i => i.url === previousServer) ? previousServer! : null,
  );
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const current = selectedUrl ? probes[selectedUrl] : undefined;
    const keep = !!selectedUrl && (!current || current.state !== 'offline');
    if (!keep && fastest !== selectedUrl) {
      setSelectedUrl(fastest);
    }
  }, [probes, selectedUrl, fastest]);

  const goBack = () => {
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      closeServers();
    }
  };

  const onConnect = async () => {
    if (!selectedUrl || connecting) {
      return;
    }
    setConnecting(true);
    clear();
    await setIndexerServer(selectedUrl, ChainNameEnum.testChainName);
    closeServers();
  };

  const selectedOnline =
    !!selectedUrl && probes[selectedUrl]?.state === 'online';
  const nothingResponded = settled && online.length === 0;
  const showAction = selectedOnline || nothingResponded;

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
        <HeaderTitle title="Listed indexers" goBack={goBack} />

        <View style={[styles.group, { backgroundColor: colors.bgSurface }]}>
          <Animated.FlatList
            data={ordered}
            keyExtractor={item => item.url}
            bounces={false}
            itemLayoutAnimation={ROW_LAYOUT}
            ItemSeparatorComponent={Separator}
            renderItem={({ item }) => (
              <IndexerRow
                item={item}
                probe={probes[item.url] ?? { state: 'checking' }}
                selected={selectedUrl === item.url}
                onPress={() => setSelectedUrl(item.url)}
              />
            )}
          />
        </View>

        {indexerList.length === 0 && (
          <Text style={[styles.caption, { color: colors.fgSubtle }]}>
            The indexer list could not be loaded.
          </Text>
        )}

        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {showAction && (
            <Animated.View
              key={nothingResponded ? 'retry' : 'continue'}
              style={[styles.action, materialize]}
            >
              {nothingResponded ? (
                <LiquidPrimaryButton
                  title="Check again"
                  onPress={probeAll}
                  style={styles.stretch}
                />
              ) : (
                <LiquidPrimaryButton
                  title="Continue"
                  disabled={connecting}
                  onPress={onConnect}
                  style={styles.stretch}
                />
              )}
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
  group: {
    flexShrink: 1,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: '#2C2C2E',
  },
  rowOffline: {
    opacity: 0.45,
  },
  rowTitle: {
    ...text.body,
    flex: 1,
  },
  rowValue: {
    ...text.subheadline,
    marginLeft: 12,
  },
  check: {
    width: 24,
    height: 24,
    marginLeft: 8,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  checkOn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  checkOff: {
    opacity: 0,
    transform: [{ scale: 0.6 }],
  },
  separatorRow: {
    paddingLeft: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  caption: {
    ...text.footnote,
    marginTop: 8,
    marginHorizontal: 36,
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

export default ListedIndexers;
